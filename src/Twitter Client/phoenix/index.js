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

    function follow() {
    }

    function showLogin() {
        $(".form").show();
        $(".home-page").hide();

        $("#login-form-title").text("Login");
        $("#fname").hide();
        $("#lname").hide();

        $("#submitbtn").text("Login");

        $("#hint2").text("Sign up");
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

        $("#hint2").text("Login");
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

    function getFeed () {
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
        sendHashtagSearch();
    })

    $("#logoutBtn").click(function(evt) {
        logout();
    })

    $("#submitbtn").click(function() {
        if (isLoginView) {
            sendLoginRequest();
        } else {
            sendRegisterRequest();
        }
    });

    showLogin();
});

