/* ==========================================================================
   Jolly Panda Profile — email-service.js

   HOW FORM SUBMISSIONS REACH THE TEAM (read this first):

   This project is currently a static site — there is no custom backend to
   receive form submissions. Instead of silently discarding the data (or
   pretending it was "sent" when it wasn't), this file relays it to
   TEAM_EMAIL using FormSubmit (https://formsubmit.co) — a free service
   built exactly for this: it accepts a POST from a static page and emails
   the payload to the address you configure, with no server of your own
   and no API key.

   ONE-TIME SETUP REQUIRED: the very first submission FormSubmit receives
   for TEAM_EMAIL triggers a confirmation email to that address. Someone
   on the team must click the confirmation link once — until then,
   FormSubmit holds submissions instead of delivering them. After that,
   every future submission is emailed automatically.

   This is an interim solution, isolated in one place on purpose. When a
   real backend exists, replace `sendRequest()`'s body with a call to your
   own endpoint (e.g. POST /api/profile/request) — nothing in form.js has
   to change, since it only calls `window.ProfileEmailService.sendRequest`.
   ========================================================================== */

window.ProfileEmailService = (function () {
  "use strict";

  var TEAM_EMAIL = "hello@jollypanda.ir";
  var ENDPOINT = "https://formsubmit.co/ajax/" + encodeURIComponent(TEAM_EMAIL);

  /**
   * sendRequest(payload) -> Promise<{ ok, error? }>
   * payload: plain object of form field name -> value.
   */
  function sendRequest(payload) {
    var body = Object.assign(
      {
        _subject: "New Jolly Panda Profile request — " + (payload.profileSlug || ""),
        _template: "table",
        _captcha: "false"
      },
      payload
    );

    return fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Email relay responded with " + res.status);
        return { ok: true };
      })
      .catch(function (err) {
        return { ok: false, error: err };
      });
  }

  return {
    TEAM_EMAIL: TEAM_EMAIL,
    sendRequest: sendRequest
  };
})();
