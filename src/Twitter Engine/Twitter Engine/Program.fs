open System.Collections.Generic
open System.Text.RegularExpressions

open Suave
open Suave.Filters
open Suave.Operators
open Suave.Successful
open Suave.Writers

open Suave.RequestErrors
open Suave.Logging

open Suave.Sockets
open Suave.Sockets.Control
open Suave.WebSocket

open Newtonsoft.Json


// Regex patterns
let mentionPattern = @"@\w+"
let hashtagPattern = @"#\w+"


// Utility functions
let getString (rawForm: byte[]) =
    System.Text.Encoding.UTF8.GetString(rawForm)

let fromJson<'a> json =
    JsonConvert.DeserializeObject(json, typeof<'a>) :?> 'a

let findAllMatches (text: string, regex: string, sep: string) = 
    let ans = new HashSet<string>()
    let matches = Regex.Matches(text, regex)
    for m in matches do
        ans.Add(m.Value) |> ignore
    ans


// Type definitions for REST and Websocket
type RegisterUserRequest = {
    Handle: string;
    FirstName: string;
    LastName: string;
    Password: string;
}

type LoginUserRequest = {
    Handle: string;
    Password: string;
}

type LogoutUserRequest = {
    Handle: string;
}

type FollowUserRequest = {
    FollowerId: int;
    FolloweeId: int;
}

type UnfollowUserRequest = {
    FollowerId: int;
    FolloweeId: int;
}

type PostTweetRequest = {
    UserId: int;
    Content: string;
}

type PostTweetResponse = {
    UserId: int;
    TweetId: int;
    Content: string;
    Success: bool;
}

type RetweetRequest = {
    UserId: int;
    TweetId: int;
    OriginalUserId: int;
}

type InitLiveConnectionRequest = {
    Handle: string;
}

type SuccessResponse = {
    Success: bool;
}

type TweetData = { 
    Id: int;
    Content: string;
    PostedById: int;
    PostedBy: string; 
}


// Models
type User = {
    Id: int;
    Handle: string;
    FirstName: string;
    LastName: string;
    Password: string;
    Followers: HashSet<int>;
    FollowingTo: HashSet<int>;
    Tweets: List<int>;
}

type Tweet = {
    Id: int;
    Content: string;
    PostedBy: int;
}

module Postman = begin
    let sendMessage (webSocket: WebSocket) (response: string) = begin
        let byteResponse = response |> System.Text.Encoding.ASCII.GetBytes |> ByteSegment
        webSocket.send Text byteResponse true
    end

    type Commands = 
        | AddConnection of int * WebSocket
        | Publish of List<int> * List<string>

    let rec private startMailbox (inbox: MailboxProcessor<Commands>) = begin
        let rec loop (liveConnections: Map<int, WebSocket>) = async {
            let! input = inbox.Receive()
            match input with
            | AddConnection (id, ws) -> 
                return! liveConnections |> Map.add id ws |> loop
            | Publish (userIds, messages) -> 
                for i in [0 .. userIds.Count - 1] do
                    if liveConnections.ContainsKey userIds.[i] then
                        let ws = liveConnections.[userIds.[i]]
                        let! res = messages.[i] |> sendMessage ws
                        ()
                    else ()
                return! loop(liveConnections)
        }
        loop(Map.empty)
    end

    let private inbox = MailboxProcessor.Start(startMailbox)
    
    let AddConnection(id, ws) = inbox.Post(AddConnection(id, ws))
    
    let Publish(userIds, messages) = inbox.Post(Publish(userIds, messages))
end


// Database
// User Id -> User Instance mapping
let users = new Dictionary<int, User>()

// User Id -> UserStatus (online / offline) mapping
let userStatus = new Dictionary<int, bool>()

// User Handle -> User Id mapping
let handles = new Dictionary<string, int>()

// User Id -> List<Tweet Id> mapping, for searching tweets where user is mentioned
let mentions = new Dictionary<int, List<int>>()

// Hashtag -> List<Tweet Id> mapping, for searching tweets having a specific hashtag
let hashtags = new Dictionary<string, List<int>>()

// Tweet Id -> Tweet Instance mapping
let tweets = new Dictionary<int, Tweet>()


// REST API functions
let registerUser = 
    request (fun r ->
        let req = r.rawForm |> getString |> fromJson<RegisterUserRequest>
        printfn "Register user request: %A" req
        let user: User = {
            Id = users.Count + 1;
            Handle = req.Handle;
            FirstName = req.FirstName;
            LastName = req.LastName;
            Password = req.Password;
            Followers = new HashSet<int>();
            FollowingTo = new HashSet<int>();
            Tweets = new List<int>();
        }
        
        users.Add((user.Id, user))
        users.[user.Id].FollowingTo.Add(user.Id) |> ignore
        users.[user.Id].Followers.Add(user.Id) |> ignore
        
        handles.Add((user.Handle, user.Id))
        
        userStatus.Add((user.Id, true))

        let res: SuccessResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> CREATED
    )
    >=> setMimeType "application/json"

let loginUser = 
    request (fun r ->
        let req = r.rawForm |> getString |> fromJson<LoginUserRequest>
        printfn "Login request: %A" req
        if handles.ContainsKey req.Handle && users.[handles.[req.Handle]].Password = req.Password then
            userStatus.[handles.[req.Handle]] <- true
            let res: SuccessResponse = { Success = true; }
            res |> JsonConvert.SerializeObject |> OK
        else
            let res: SuccessResponse = { Success = false; }
            res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let logoutUser = 
    request (fun r ->
        let req = r.rawForm |> getString |> fromJson<LogoutUserRequest>
        printfn "Logout request: %A" req
        userStatus.[handles.[req.Handle]] <- false
        let res: SuccessResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let followUser = 
    request (fun r -> 
        let req = r.rawForm |> getString |> fromJson<FollowUserRequest>
        printfn "Follow request: %A" req
        users.[req.FollowerId].FollowingTo.Add(req.FolloweeId) |> ignore
        users.[req.FolloweeId].Followers.Add(req.FollowerId) |> ignore
        for u in users do
            printfn "%A" u
        let res: SuccessResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let unfollowUser = 
    request (fun r -> 
        let req = r.rawForm |> getString |> fromJson<UnfollowUserRequest>
        printfn "Unfollow request: %A" req
        users.[req.FollowerId].FollowingTo.Remove(req.FolloweeId) |> ignore
        users.[req.FolloweeId].Followers.Remove(req.FollowerId) |> ignore
        for u in users do
            printfn "%A" u
        let res: SuccessResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let postTweet = 
    request (fun r -> 
        let req = r.rawForm |> getString |> fromJson<PostTweetRequest>
        printfn "PostTweet request: %A" req

        let tweet: Tweet = {
            Id = tweets.Count + 1;
            Content = req.Content;
            PostedBy = req.UserId;
        }
        tweets.Add((tweet.Id, tweet))

        users.[req.UserId].Tweets.Add(tweet.Id) |> ignore

        let tweetMentions = findAllMatches(req.Content, mentionPattern, "@")
        
        let ids = new List<int>()
        let messages = new List<string>()

        for mention in tweetMentions do
            if handles.ContainsKey mention then
                let userId = handles.[mention]
                
                ids.Add(userId)

                let tweetData: TweetData = {
                    Id = tweet.Id; 
                    Content = req.Content; 
                    PostedBy = users.[req.UserId].Handle;
                    PostedById = req.UserId; 
                }
                messages.Add(tweetData |> JsonConvert.SerializeObject)

                if mentions.ContainsKey userId then
                    mentions.[userId].Add(tweet.Id)
                else 
                    let tweetIdList = new List<int>()
                    tweetIdList.Add(tweet.Id)
                    mentions.Add((userId, tweetIdList))
        
        let tweetHashtags = findAllMatches(req.Content, hashtagPattern, "#")
        for tag in tweetHashtags do
            if hashtags.ContainsKey tag then
                hashtags.[tag].Add(tweet.Id)
            else 
                let tweetIdList = new List<int>()
                tweetIdList.Add(tweet.Id)
                hashtags.Add((tag, tweetIdList))

        let followers = users.[req.UserId].Followers
        for follower in followers do 
            if userStatus.[follower] then
                ids.Add(follower)
                
                let tweetData: TweetData = {
                    Id = tweet.Id; 
                    Content = req.Content; 
                    PostedBy = users.[req.UserId].Handle;
                    PostedById = req.UserId; 
                }
                messages.Add(tweetData |> JsonConvert.SerializeObject)

        Postman.Publish (ids, messages)

        let res: PostTweetResponse = { 
            UserId = req.UserId;
            TweetId = tweet.Id;
            Content = tweet.Content;
            Success = true;
        }
        res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let retweet = 
    request (fun r -> 
        let req = r.rawForm |> getString |> fromJson<RetweetRequest>
        let followers = users.[req.UserId].Followers
        let ids = new List<int>()
        let messages = new List<string>()
        for follower in followers do 
            if userStatus.[follower] then
                ids.Add(follower)
                
                let tweetData: TweetData = {
                    Id = req.TweetId; 
                    Content = tweets.[req.TweetId].Content; 
                    PostedBy = users.[req.OriginalUserId].Handle;
                    PostedById = req.OriginalUserId; 
                }
                messages.Add(tweetData |> JsonConvert.SerializeObject)

        let res: SuccessResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let getTweetsWithHashtag hashtag = 
    printfn "Hashtag tweets request: %A" hashtag
    let res: SuccessResponse = { Success = true; }
    res |> JsonConvert.SerializeObject |> OK
    >=> setMimeType "application/json"

let getTweetsWithMention handle = 
    printfn "Mention tweets request: %A" handle
    let res: SuccessResponse = { Success = true; }
    res |> JsonConvert.SerializeObject |> OK
    >=> setMimeType "application/json"


// Websocket
let ws (webSocket : WebSocket) (context : HttpContext) =
    socket {
        // if `loop` is set to false, the server will stop receiving messages
        let mutable loop = true

        while loop do
            // the server will wait for a message to be received without blocking the thread
            let! msg = webSocket.read()

            match msg with
            | (Text, data, true) ->
                let req = data |> getString |> fromJson<InitLiveConnectionRequest>

                if handles.ContainsKey req.Handle then
                    Postman.AddConnection (handles.[req.Handle], webSocket)

                let response = "Connected!"
                    
                // the response needs to be converted to a ByteSegment
                let byteResponse = response |> System.Text.Encoding.ASCII.GetBytes |> ByteSegment
                
                // the `send` function sends a message back to the client
                do! webSocket.send Text byteResponse true
            | (Close, _, _) ->
                let emptyResponse = [||] |> ByteSegment
                do! webSocket.send Close emptyResponse true

                // after sending a Close message, stop the loop
                // loop <- false
            | _ -> ()
    }


// CORS Headers
let setCORSHeaders = 
    addHeader  "Access-Control-Allow-Origin" "*" 
    >=> setHeader "Access-Control-Allow-Headers" "token" 
    >=> addHeader "Access-Control-Allow-Headers" "content-type" 
    >=> addHeader "Access-Control-Allow-Methods" "GET,POST,PUT"


// Routes
let app : WebPart = 
    choose [
        GET >=> 
            fun context ->
                context |> (
                    setCORSHeaders
                    >=> choose [
                            pathScan "/feed/%d" (fun id ->  getFeed id)
                            pathScan "/hashtag-tweets/%s" (fun hashtag ->   getTweetsWithHashtag hashtag)
                            pathScan "/mention-tweets/%s" (fun handle ->    getTweetsWithMention handle)
                        ])

        POST >=> 
            fun context ->
                context |> (
                    setCORSHeaders
                    >=> choose [
                            path "/register" >=> registerUser
                            path "/login" >=> loginUser
                            path "/logout" >=> logoutUser
                            path "/follow" >=> followUser
                            path "/unfollow" >=> unfollowUser
                            path "/tweet" >=> postTweet
                            path "/retweet" >=> retweet
                        ])

        path "/websocket" >=> handShake ws

        NOT_FOUND "Resource not found. 404!" ]


[<EntryPoint>]
let main argv =
    startWebServer { defaultConfig with logger = Targets.create Verbose [||] } app
    0
