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
        const response = JSON.parse(evt.data);
        if (response) {
            if (response.hasOwnProperty('Content')) {
                addTweetItem(response.Id, response.PostedBy, response.Content);
            }
            else if (response.hasOwnProperty('Handle')) {
                addUserItem(response.Handle);
            }
        }
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

        getFeedRequest(handle);

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

    function addTweetItem(id = 0, handle = '', content = '') {
        $("#tweet-id").text(id);
        $("#tweet-list").append('<li class="tweet-item"><div class="single-tweet"><p class="tweet-author">' + '@' + handle + '</p><div class="row tweet-data-container"><p class="col-md-8 tweet-content">' + content + '</p><button id="btnretweet" class="form-control" type="button">Retweet</button></div></div></li>');
        $("#btnRetweet").attr("data-tweet-id", id);
        $("#btnRetweet").attr("data-tweet-poster", handle);

        $("#btnRetweet").click(function(evt) {
            retweetRequest($(this).data('tweet-id'), $(this).data('tweet-poster'));
        });
    }

    function addUserItem(handle = '') {
        $("#user-list").append('<li class= "user-item"><div class="single-user"><div class="row"><p class="col-md-6 user-content">'+ handle +'</p><button id="btnFollow" class="form-control" type="button">Follow</button></div></div></li>');
    }

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
        var tag = $("#searchText").val();
        tag = tag.substring(1);
        console.log(tag);
        $.ajax({
            url: URL + 'hashtag-tweets/' + tag,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'GET',
            dataType: 'json',
            data: JSON.stringify({}),
            success: function (result) {
                if (result.Success) {
                    $('#tweet-list').empty();
                    for (var i = 0; i < result.Tweets.length; i++) {
                        var tweetObj = result.Tweets[i];
                        addTweetItem(tweetObj.Id, tweetObj.PostedBy, tweetObj.Content);
                    }
                } else {
                    showError("Error! Cannot Get Feed!");
                }
            }
        });
    }

    function getFeedRequest(handle = '') {
        $.ajax({
            url: URL + 'feed/' + handle,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'GET',
            dataType: 'json',
            data: JSON.stringify({}),
            success: function (result) {
                if (result.Success) {
                    $('#tweet-list').empty();
                    for (var i = 0; i < result.Tweets.length; i++) {
                        var tweetObj = result.Tweets[i];
                        addTweetItem(tweetObj.Id, tweetObj.PostedBy, tweetObj.Content);
                    }
                } else {
                    showError("Error! Cannot Get Feed!");    
                }
            },
            error: function () {
                showError("Error! Cannot Get Feed!");
            }
        });
    }

    function getMentions(handle = '') {
        $.ajax({
            url: URL + 'mention-tweets/' + handle,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            type: 'GET',
            dataType: 'json',
            data: JSON.stringify({}),
            success: function (result) {
                console.log(result);
                if (result.Success) {
                    $('#tweet-list').empty();
                    for (var i = 0; i < result.Tweets.length; i++) {
                        var tweetObj = result.Tweets[i];
                        addTweetItem(tweetObj.Id, tweetObj.PostedBy, tweetObj.Content);
                    }
                } else {
                    showError("Error! Cannot Get Mentions!");    
                }
            },
            error: function () {
                showError("Error! Cannot Get Mentions!");
            }
        });
    }

    function followRequest() {
        var followee = $("#follow").val();
        followee = followee.substring(1);
        const req = {
            FollowerHandle: myHandle,
            FolloweeHandle: followee
        }
        console.log(followee);

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
                $('#follow').val("");
            },
            error: function () {
                showError("Error! User follow failed.");
                $('#follow').val("");
            }
        });
    }

    function unfollowRequest () {
        var followee = $('#unfollow').val();
        followee = followee.substring(1);
        const req = {
            FollowerHandle: myHandle,
            FolloweeHandle: followee
        }

        console.log(req);

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
                // $('#unfollow').val("");
            },
            error: function () {
                showError("Error! User unfollow failed.");
                // $('#unfollow').val("");
            }
        });
    }

    function retweetRequest (id, ogHandle) {
        const req = {
            Handle: $('#handleip').val(),
            TweetId: id,
            OriginalHandle: ogHandle
        }

        $.ajax({
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

    $("#followBtn").click(function(evt) {
        followRequest();

    });

    $("#unfollowBtn").click(function(evt) {
        unfollowRequest();
    });

    $("#submitbtn").click(function() {
        if (isLoginView) {
            sendLoginRequest();
        } else {
            sendRegisterRequest();
        }
    });

    $("#tweetradios input[name='radiotype']").click(function(){
        if($('input:radio[name=radiotype]:checked').val() == "mention"){
            getMentions(myHandle);
        } else {
            getFeedRequest(myHandle);
        }
    });

    showLogin();

    // showHomePage();
});

