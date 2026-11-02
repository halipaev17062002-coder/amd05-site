/* Подставляет данные из legal-config.js в страницы. Этот файл менять не нужно. */
(function () {
  var L = window.LEGAL || {};
  var LABEL = {
    operator: "ФИО (ИП / самозанятый) или название ООО",
    inn: "ИНН",
    ogrnip: "ОГРНИП",
    email: "e-mail",
    repairWarranty: "срок гарантии на ремонт"
  };

  function operator() {
    if (!L.name) return "";
    return L.status === "ИП" ? "ИП " + L.name : L.name;
  }
  function val(k) {
    if (k === "operator") return operator();
    if (k === "ogrnLabel") return L.status === "ООО" ? "ОГРН" : "ОГРНИП";
    if (k === "npd") return L.status === "Самозанятый" ? "плательщик налога на профессиональный доход" : "";
    return L[k] || "";
  }

  function run() {
    var i, el, k, v, nodes;
    nodes = document.querySelectorAll("[data-show-if]");
    for (i = 0; i < nodes.length; i++) {
      if (!val(nodes[i].getAttribute("data-show-if"))) nodes[i].style.display = "none";
    }
    nodes = document.querySelectorAll("[data-l]");
    for (i = 0; i < nodes.length; i++) {
      el = nodes[i]; k = el.getAttribute("data-l"); v = val(k);
      var hid = el.closest("[data-show-if]");
      if (v) { el.textContent = v; el.classList.remove("ph"); }
      else if (hid && hid.style.display === "none") { el.textContent = ""; }
      else { el.textContent = "[ВПИШИТЕ: " + (LABEL[k] || k) + "]"; el.classList.add("ph"); }
    }
    /* строка реквизитов внизу сайта: показывается, только когда данные заполнены */
    var r = document.getElementById("legalReq");
    if (r) {
      var parts = [];
      if (operator()) parts.push(operator() + (val("npd") ? " (" + val("npd") + ")" : ""));
      if (L.inn) parts.push("ИНН " + L.inn);
      if (L.ogrnip && L.status !== "Самозанятый") parts.push(val("ogrnLabel") + " " + L.ogrnip);
      if (parts.length) { r.textContent = parts.join(" · "); r.style.display = ""; }
      else { r.style.display = "none"; }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
