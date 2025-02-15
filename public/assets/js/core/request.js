
//Register form validation and handler
const registerUser = function(){
    username = document.getElementById('exampleInputtext').value;
    email = document.getElementById('exampleInputEmail1').value;
    password = document.getElementById('exampleInputPassword1').value;
  
    if (email == "" || password == "" || username == "") {
        
        document.getElementById('alert-Tab').innerHTML = `
                        
                <div class="mb-2 alert bg-dark-subtle text-white alert-dismissible fade show mb-0" role="alert">
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert" aria-label="Close"></button>
                  <strong>Dark - </strong> A simple dark alert
                </div>`
                  
                  var div = document.getElementById("alert-Tab");
                  div.style.opacity = "1";
                  div.style.display = "block";
    }else{
        console.log('I was run front end');
        
        $.ajax({
            url: '/api/register',
            // dataType: "jsonp",
            data: {
              email: email,
              password: password,
              username: username
            },
            type: 'POST',
            success: function (data) {
              if(data.alert == 'true'){
  
                  document.getElementById('alert-Tab').innerHTML = `
                  <div class="mb-2 alert bg-dark-subtle text-white alert-dismissible fade show mb-0" role="alert">
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert" aria-label="Close"></button>
                    <strong>${data.alertType} - </strong> ${data.message}
                  </div>`
  
                    var div = document.getElementById("alert-Tab");
                    div.style.opacity = "1";
                    div.style.display = "block";
              }
              if(data.alertType == 'Success'){
                login2000();
              }
            },
            error: function (status, error) {
              console.log('Error: ' + error.message);
            },
          });
    }
}

//Bank details updation form
const bankDetails = function(){
    holdersName = document.getElementById('holdersName').value
    accountNumber = document.getElementById('accountNumber').value
    bankName = document.getElementById('bankName').value
    ifsc = document.getElementById('ifsc').value
  
    $.ajax({
      url: '/api/bankDetails',
      // dataType: "jsonp",
      data: {
        holdersName: holdersName,
        accountNumber: accountNumber,
        bankName: bankName,
        ifsc: ifsc
      },
      type: 'POST',
      success: function (data) {
        if( data.redirect == undefined){
  
        }else{
          login2000();
        }
        if(data.alert == 'true'){

            document.getElementById('alert').innerHTML = `
            <div class="alert `+data.alertType+`">
                <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                <p class='text-white'>`+data.message+`</p>
              </div>`

              var div = document.getElementById("alert");
              div.style.opacity = "1";
              div.style.display = "block";
        }
        if(data.alertType == 'success'){
          dashboard2000();
        }
      },
      error: function (status, error) {
        console.log('Error: ' + error.message);
      },
    });
  
  
}

//Payment verification
const paymentVerification = function(){

    amount = document.getElementById('amount').value
    trnxId = document.getElementById('trnxId').value
    $.ajax({
      url: '/api/paymentVerification',
      // dataType: "jsonp",
      data: {
        amount: amount,
        trnxId: trnxId
      },
      type: 'POST',
      success: function (data) {
        if( data.redirect == undefined){
          if(data.alert == 'true'){
            
            document.getElementById('alert').innerHTML = `
            <div class="alert `+data.alertType+`">
                <span class="closebtn" onclick="closebtn()" id="closebtn">&times;</span>
                <p class='text-white'>`+data.message+`</p>
              </div>`

              var div = document.getElementById("alert");
              div.style.opacity = "1";
              div.style.display = "block";

          }
          if(data.alertType == 'success'){
           dashboard2000();
          }
        }else{
          login2000();
        }
  
      },
      error: function (status, error) {
        console.log('Error: ' + error.message);
      }
    });
}

//Payment gateway
const paymentGateway = function(event){
  const clickedElement = event.target;
  const amount = clickedElement.getAttribute('name');
  const url = '/planDetails/'+Number(amount);


  $.ajax({
      url: url,
      type: 'GET',
      success:function(data){
          
          if(data.redirect == undefined){
              
              document.getElementById('wallet').innerHTML = 
              `
              <section class="card pull-up">
                  <div class="card-content">
                      <div class="card-body">
                          <div class="col-12">
                              <div class="row">
                                  <div class="col-md-6 col-12 py-1">
                                      <div class="media">
                                          <div class="media-body text-center px-2">
                                              <h3 class="mt-0 text-capitalize">Payment Portal</h3>
                                          </div>
                                      </div>
                                  </div>
                                  <div class="col-md-2 col-12 py-1 text-center">
                                      <div class="text-center mb-1">
                                      <span class="text-xs">Scan the QR below</span>
                                  </div>
                                  <div class="text-center">
                                      <img class="text-center scanner_img" id="qrcode" alt="">
                                  </div>
                                  <div class="text-center mt-2">
                                      <span class="text-xs">Or use <span class="text-dark font-weight-bolder  ms-sm-2"> `+data.upiId+` </span> to invest.</span>
                                  </div>
                                  </div>
                                  <div class="col-md-10 col-12">
                                      <form class="form-horizontal form-referral-link row mt-2" action="">
                                          <div class="col-12">
                                              <fieldset class="form-label-group">
                                                  <input type="number" class="form-control" name="amount" id="amount" disabled value="`+data.amount+`"  required="" autofocus="">
                                                  <label for="amount">Plan amount</label>
                                              </fieldset>
                                          </div>
                                          <div class="col-12">
                                              <fieldset class="form-label-group">
                                                  <input type="number" class="form-control" name="trnxId" id="trnxId"  required="" autofocus="">
                                                  <label for="trnxId">UTR or TRN number</label>
                                              </fieldset>
                                          </div>
                                      </form>
                                  </div>
                                  <div class="col-md-2 col-12 py-1 text-center">
                                      <a href="#"name='240' onclick="paymentVerification()" class="btn-gradient-primary my-1 line-height-3">Submit</a>
                                  </div>
                                  <div id="alert">
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </section>`
          }
      },
      error:function(error){
          console.log(error);
          
      }
});

async function fetchQR() {
const response = await fetch('/generateQR');
const data = await response.json();
document.getElementById('qrcode').src = data.url;
}

fetchQR();
}


  











var dashboard2000 = function(){
  setTimeout(function () {
    window.location.href = "/dashboard";
  }, 2000);
}
var login2000 = function(){
  setTimeout(function () {
    window.location.href = "/login";
  }, 2000);
}
