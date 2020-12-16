$(function() {
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

    showLogin();

    $(document).on('click', 'a[name=signinlink]', function(e) {
        if (isLoginView) showSignin();
        else showLogin();
    });
});

