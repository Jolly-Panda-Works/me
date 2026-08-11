/* ==========================================================================
   Jolly Panda Profile — plan-select.js
   Clicking "Choose this plan" on a pricing card pre-fills the request
   form's "Selected Plan" field with that plan, so the choice carries
   through to the email the team receives (see email-service.js / form.js).
   ========================================================================== */

(function () {
  "use strict";

  function init() {
    var select = document.getElementById("selectedPlan");
    if (!select) return;

    document.querySelectorAll(".pricing-card__cta[data-plan]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var plan = btn.getAttribute("data-plan");
        if (!plan) return;
        select.value = plan;
        select.classList.add("is-highlighted");
        setTimeout(function () { select.classList.remove("is-highlighted"); }, 1200);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
