/* ==========================================================================
   Jolly Panda Profile — form.js
   Client-side validation + the submission flow. The key rule this file
   encodes: an "available" state shown while typing is NOT a reservation.
   The slug is re-checked authoritatively (via attemptReserveSlug) at the
   moment of submission, because it could have been taken by someone else
   in between.
   ========================================================================== */

(function () {
  "use strict";

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

  var form, submitBtn, feedbackEl;

  function t(key) {
    return (window.JollyPandaLang && window.JollyPandaLang.t(key)) || key;
  }

  function fieldError(field, key) {
    var group = field.closest(".form-field");
    if (!group) return;
    var errEl = group.querySelector(".form-field__error");
    if (!errEl) return;
    errEl.textContent = key ? t(key) : "";
    errEl.setAttribute("data-i18n", key || "");
    group.classList.toggle("has-error", !!key);
  }

  function validateRequiredFields() {
    var valid = true;
    ["fullName", "phone", "email", "profession", "selectedPlan", "projectDetails"].forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      var value = field.value.trim();
      if (!value) {
        fieldError(field, "errors.required");
        valid = false;
      } else if (name === "email" && !EMAIL_RE.test(value)) {
        fieldError(field, "errors.invalidEmail");
        valid = false;
      } else if (name === "phone" && !PHONE_RE.test(value)) {
        fieldError(field, "errors.invalidPhone");
        valid = false;
      } else {
        fieldError(field, null);
      }
    });
    return valid;
  }

  function showFeedback(status, textKey) {
    if (!feedbackEl) return;
    feedbackEl.classList.remove("is-success", "is-error");
    if (status) feedbackEl.classList.add(status === "success" ? "is-success" : "is-error");
    feedbackEl.textContent = t(textKey);
    feedbackEl.setAttribute("data-i18n", textKey);
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = t(isSubmitting ? "form.submitting" : "form.submit");
    submitBtn.setAttribute("data-i18n", isSubmitting ? "form.submitting" : "form.submit");
  }

  function handleSubmit(e) {
    e.preventDefault();
    showFeedback(null, "");

    var fieldsValid = validateRequiredFields();
    var slugInput = document.getElementById("profileSlugInput");
    var rawSlug = slugInput ? slugInput.value : "";

    if (!rawSlug.trim()) {
      showFeedback("error", "errors.slugRequired");
      return;
    }

    setSubmitting(true);

    // Authoritative re-check + reservation attempt. Even though the UI may
    // already show "available" from the debounced check, that snapshot can
    // be stale — this call is the one that actually matters.
    window.ProfileSlugService.attemptReserveSlug(rawSlug).then(function (result) {
      setSubmitting(false);

      if (!result.ok) {
        if (result.code === "SLUG_ALREADY_TAKEN") {
          showFeedback("error", "slug.takenBySomeoneElse");
        } else {
          showFeedback("error", "errors.slugNotAvailable");
        }
        // Re-trigger the live indicator so the field visibly reflects reality.
        if (slugInput) slugInput.dispatchEvent(new Event("input"));
        return;
      }

      if (!fieldsValid) {
        showFeedback("error", "errors.required");
        return;
      }

      // Actually deliver the submission — see email-service.js for exactly
      // where this data goes and the one-time setup it requires.
      setSubmitting(true);
      var planValue = form.elements.selectedPlan.value;
      var payload = {
        fullName: form.elements.fullName.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
        profession: form.elements.profession.value.trim(),
        selectedPlan: planValue,
        selectedPlanLabel: planValue ? t("pricing.plans." + planValue + ".name") : "",
        projectDetails: form.elements.projectDetails.value.trim(),
        profileSlug: result.slug,
        profileUrl: "https://me.jollypanda.ir/" + result.slug
      };

      window.ProfileEmailService.sendRequest(payload).then(function (sendResult) {
        setSubmitting(false);

        if (!sendResult.ok) {
          showFeedback("error", "form.deliveryError");
          return;
        }

        form.reset();
        if (slugInput) slugInput.dispatchEvent(new Event("input"));
        feedbackEl.classList.remove("is-error");
        feedbackEl.classList.add("is-success");
        feedbackEl.innerHTML = "";
        var title = document.createElement("strong");
        title.setAttribute("data-i18n", "form.successTitle");
        title.textContent = t("form.successTitle");
        var body = document.createElement("span");
        body.setAttribute("data-i18n", "form.successBody");
        body.textContent = t("form.successBody");
        feedbackEl.appendChild(title);
        feedbackEl.appendChild(document.createElement("br"));
        feedbackEl.appendChild(body);
      });
    });
  }

  function init() {
    form = document.getElementById("profileRequestForm");
    if (!form) return;
    submitBtn = document.getElementById("profileSubmitBtn");
    feedbackEl = document.getElementById("profileFormFeedback");

    form.addEventListener("submit", handleSubmit);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
