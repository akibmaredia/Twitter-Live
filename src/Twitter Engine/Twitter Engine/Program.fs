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


// Database
// User Id -> WebSocket instance mapping
let liveConnections = new Dictionary<int, WebSocket>()

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


// Routes
let app : WebPart = 
    choose [
        POST >=> choose [
            path "/register" >=> registerUser
            path "/login" >=> loginUser
            path "/logout" >=> logoutUser
        ]

        NOT_FOUND "Resource not found. 404!" ]


[<EntryPoint>]
let main argv =
    startWebServer { defaultConfig with logger = Targets.create Verbose [||] } app
    0
