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


// Type definitions for REST
type RegisterUserRequest = {
    Handle: string;
    FirstName: string;
    LastName: string;
    Password: string;
}

type RegisterUserResponse = {
    Success: bool;
}

type LoginUserRequest = {
    Handle: string;
    Password: string;
}

type LoginUserResponse = {
    Success: bool;
}

type LogoutUserRequest = {
    Handle: string;
}

type LogoutUserResponse = {
    Success: bool;
}

type FollowUserRequest = {
    FollowerId: int;
    FolloweeId: int;
}

type FollowUserResponse = {
    Success: bool;
}

type UnfollowUserRequest = {
    FollowerId: int;
    FolloweeId: int;
}

type UnfollowUserResponse = {
    Success: bool;
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

        for u in users do
            printfn "%A" u

        let res: RegisterUserResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> CREATED
    )
    >=> setMimeType "application/json"

let loginUser = 
    request (fun r ->
        let req = r.rawForm |> getString |> fromJson<LoginUserRequest>
        printfn "Login request: %A" req
        if handles.ContainsKey req.Handle && users.[handles.[req.Handle]].Password = req.Password then
            userStatus.[handles.[req.Handle]] <- true
            let res: LoginUserResponse = { Success = true; }
            res |> JsonConvert.SerializeObject |> OK
        else
            let res: LoginUserResponse = { Success = false; }
            res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"

let logoutUser = 
    request (fun r ->
        let req = r.rawForm |> getString |> fromJson<LogoutUserRequest>
        printfn "Logout request: %A" req
        userStatus.[handles.[req.Handle]] <- false
        let res: LogoutUserResponse = { Success = true; }
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
        let res: FollowUserResponse = { Success = true; }
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
        let res: UnfollowUserResponse = { Success = true; }
        res |> JsonConvert.SerializeObject |> OK
    )
    >=> setMimeType "application/json"


// Routes
let app : WebPart = 
    choose [
        POST >=> choose [
            path "/register" >=> registerUser
            path "/login" >=> loginUser
            path "/logout" >=> logoutUser
            path "/follow" >=> followUser
            path "/unfollow" >=> unfollowUser
        ]

        NOT_FOUND "Resource not found. 404!" ]


[<EntryPoint>]
let main argv =
    startWebServer { defaultConfig with logger = Targets.create Verbose [||] } app
    0
