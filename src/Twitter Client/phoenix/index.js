$(function() {
    const URL = "http://localhost:8080/";

    var isLoginView = false;
    var isHomePageView = false;
    
    function showLogin() {
        $("#login-form-title").text("Login");
        $("#fname").hide();
        $("#lname").hide();

        $("#submitbtn").text("Login");

        $("#hint2").text("Sign in");
        var cache = $('#hint1').children();
        $("#hint1").text("Not a registered user? ").append(cache);

        isLoginView = true;
        isHomePageView = false;
    }
    
    function showSignin() {
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
    
    function showHomePage() {
        isHomePageView = true;
        isLoginView = false;
    }

    function showError(errorMessage) {
        alert(errorMessage);
    }

    showLogin();

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
            type: 'POST', /* or type:"GET" or type:"PUT" */
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                console.log(result);
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
            type: 'POST', /* or type:"GET" or type:"PUT" */
            dataType: 'json',
            data: JSON.stringify(req),
            success: function (result) {
                console.log(result);
            },
            error: function () {
                showError("Error! User registeration failed.");
            }
        });
    }

    $("#submitbtn").click(function() {
        if (isLoginView) {
            sendLoginRequest();
        } else {
            sendRegisterRequest();
        }
    });
});

