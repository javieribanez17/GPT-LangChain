if (document.getElementById("btn-txt-area")) {
  const textarea = document.getElementById("questionModel");
  const boton = document.getElementById("btn-txt-area");
  textarea.addEventListener("input", () => {
    boton.disabled = textarea.value.length === 0;
  });
  boton.addEventListener("click", function () {
    var container = document.getElementById("loaderContainer");
    container.style.display = "block";
  });
}

if (document.getElementById("btn-upload")) {
  const btnFile = document.getElementById("btn-upload");
  const uploadFile = document.getElementById("LoadFile");
  uploadFile.addEventListener("change", () => {
    btnFile.disabled = uploadFile.files.length === 0;
  });
  btnFile.addEventListener("click", function () {
    var container = document.getElementById("loaderContainer");
    container.style.display = "block";
  });
}
if (document.getElementById("btn-triage")) {
  document.getElementById("btn-triage").addEventListener("click", function () {
    console.log("click on me");
    window.open("/test");
  });
}

if (document.getElementsByClassName("consult")) {
  const btnConsults = document.getElementsByClassName("consult");
  console.log(btnConsults.length);
  for (var i = 0; i < btnConsults.length; i++) {
    btnConsults[i].addEventListener("click", function () {
      var container = document.getElementById("loaderContainer");
      container.style.display = "block";
    });
  }
}
