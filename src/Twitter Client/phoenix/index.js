$(function() {
    const URL = "http://localhost:8080/";

    const WebsocketURL = "ws://localhost:8080/websocket";

    var isLoginView = false;
    var isHomePageView = false;

    var myHandle = '';
    
    function initWebsocket() {
        websocket = new WebSocket(WebsocketURL);
        websocket.onopen = function (evt) { onOpen(evt) };
        websocket.onclose = function (evt) { onClose(evt) };
        websocket.onmessage = function (evt) { onMessage(evt) };
        websocket.onerror = function (evt) { onError(evt) };
    }

    function onOpen(evt) {
        console.log('Websocket connection opened!');

        // Send connection req on open
        let msg = { Handle: myHandle };
        websocket.send(JSON.stringify(msg));
    }

    function onClose(evt) {
        console.log('Websocket connection closed!');
    }

    function onMessage(evt) {
        console.log('Message from websocket - ' + evt.data);
    }

    function onError(evt) {
        console.log('Error from websocket - ' + evt.data);
    }

    function showLogin() {
        $(".form").show();
        $(".home-page").hide();

        $("#login-form-title").text("Login");
        $("#fname").hide();
        $("#lname").hide();

        $("#submitbtn").text("Login");

        var cache = $('#hint1').children();
        $("#hint1").text("Not a registered user? ").append(cache);

        isLoginView = true;
        isHomePageView = false;
    }
    
    function showSignin() {
        $(".form").show();
        $(".home-page").hide();

        $("#login-form-title").text("Sign up");
        $("#fname").show();
        $("#lname").show();

        $("#submitbtn").text("Sign up");

        var cache = $('#hint1').children();
        $("#hint1").text("Already a user? ").append(cache);

        isLoginView = false;
        isHomePageView = false;
    }
    
    function showHomePage(handle = 'Handle', fc1 = 0, fc2 = 0, tc = 0) {
        myHandle = handle;

        initWebsocket();

        $(".form").hide();
        $(".home-page").show();

        $("#uname").text('@' + handle);
        $("#fc1").text('Followers - ' + fc1);
        $("#fc2").text('Following - ' + fc2);
        $("#tc").text('Tweets - ' + tc);

        getFeedRequest();

        isHomePageView = true;
        isLoginView = false;
    }

    function showError(errorMessage) {
        alert(errorMessage);
    }

    $(document).on('click', 'a[name=signinlink]', function(e) {
        if (isLoginView) showSignin();
        else showLogin();
    });

    function sendLoginRequest() {
        const req = {
            Handle: $("#handleip").val(),
            Password: $("#pwdip").val()
        };

        $.ajax({
            url: URL + 'login',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                if (result.Success) {
                    showHomePage(req.Handle, result.FollowerCount, result.FollowingCount, result.TweetCount);
                } else {
                    showError("Error! Login failed. Invalid username and / or password.");
                }
            },
            error: function () {
                showError("Error! Login failed. Invalid username and / or password.");
            }
        });
    }

    function sendRegisterRequest() {
        const req = {
            Handle: $("#handleip").val(),
            FirstName: $("#fnameip").val(),
            LastName: $("#lnameip").val(),
            Password: $("#pwdip").val()
        };

        $.ajax({
            url: URL + 'register',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                if (result.Success) {
                    showHomePage(req.Handle, result.FollowerCount, result.FollowingCount, result.TweetCount);
                } else {
                    showError("Error! Login failed. Invalid username and / or password.");
                }
            },
            error: function () {
                showError("Error! User registeration failed.");
            }
        });
    }

    function getTweetsWithTag () {
        const tweets = {
        }

        $.ajax({
            url: URL + 'feed/' + $("#searchText").val(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'GET',
            dataType: 'json',
            data: JSON.stringify({}),
            success: function (result) {
            },
            error: function () {
                showError("Error! Cannot Get Feed!");
            }
        });
    }

    function getFeedRequest () {
        const req = {
            Handle: $("#handleip").val()
        }

        const tweets = {}

        $.ajax({
            url: URL + 'feed/' + $("#handleip").val(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'GET',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                // if(success) {
                //     tweets =
                // }
                // else {
                // }
            },
            error: function () {
                showError("Error! Cannot Get Feed!");
            }
        });

    }

    function followRequest() {
        const req = {
            FollowerHandle: $('#handleip').val(),
            FolloweeHandle: $('').val(),
        }

        $.ajax({
            url: URL + 'follow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                console.log("user followed");
            },
            error: function () {
                showError("Error! User follow failed.");
            }
        });
    }

    function unfollowRequest () {
        const req = {
            FollowerHandle: $('#handleip').val(),
            FolloweeHandle: $('').val(),
        }

        $.ajax({
            url: URL + 'unfollow',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                console.log("user unfollowed")
            },
            error: function () {
                showError("Error! User unfollow failed.");
            }
        });
    }

    function retweetRequest () {
        const req = {
            Handle: $('#handleip').val(),
            TweetId: $('#tweetId').val(),
            OriginalHandle: $('#ogHandle').val(),
        }

        $ajax({
            url: URL + 'retweet',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                console.log("Retweeted")
            },
            error: function () {
                showError("Error! User logout failed.");
            }
        });
    }

    function tweetRequest () {
        const req = {
            Handle: $('#handleip').val(),
            Content: $('#tweet-input-box').val(),
        }

        $.ajax({
            url: URL + 'tweet',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                console.log("Tweet posted")
            },
            error: function () {
                showError("Error! User logout failed.");
            }
        });
    }

    function logout() {
        const req = {
            Handle: $("#handleip").val()
        }

        $.ajax({
            url: URL + 'logout',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                showLogin();
                websocket.close();
            },
            error: function () {
                showError("Error! User logout failed.");
            }
        });
        showLogin();
    }

    $("#searchBtn").click(function() {
        getTweetsWithTag();
    });

    $("#logoutBtn").click(function(evt) {
        logout();
    });

    $("#btnTweet").click(function(evt) {
        tweetRequest()
    });

    $("#btnFollow").click(function(evt) {
        if($('#followBtn').textContent == 'Unfollow') {
            unfollowRequest();
            $('#followBtn').textContent = 'Follow';
        }
        else {
            followRequest();
            $('#followBtn').textContent = 'Follow';
        }

    });

    $("#btnRetweet").click(function(evt) {
        retweetRequest();
    });

    $("#submitbtn").click(function() {
        if (isLoginView) {
            sendLoginRequest();
        } else {
            sendRegisterRequest();
        }
    });

    // showLogin();

    showHomePage();
});

