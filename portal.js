/* Core logic of the Assignment Submission Portal.
 * Works in the browser (window.Portal) and in Node (require) so it can be tested automatically. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Portal = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function isValidUrl(value) {
    if (typeof value !== "string" || /\s/.test(value)) return false;
    try {
      var u = new URL(value);
      return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.length > 0;
    } catch (e) {
      return false;
    }
  }

  /* Returns an object like { reg_no: "message" }. Empty object = valid. */
  function validate(d) {
    var errors = {};
    var name = String(d.name || "").trim();
    var reg = String(d.reg_no || "").trim();
    var title = String(d.title || "").trim();
    var url = String(d.url || "").trim();

    if (!name) errors.name = "Student name is required.";
    if (!reg) errors.reg_no = "Registration number is required.";
    if (!title) errors.title = "Assignment title is required.";
    if (!url) errors.url = "Submission URL is required.";
    else if (!isValidUrl(url)) errors.url = "Submission URL is invalid. Use http:// or https://";
    return errors;
  }

  /* storage = any object with getItem(key) and setItem(key, value) */
  function createStore(storage, key) {
    key = key || "assignment_submissions";

    function list() {
      try {
        return JSON.parse(storage.getItem(key)) || [];
      } catch (e) {
        return [];
      }
    }

    function write(items) {
      storage.setItem(key, JSON.stringify(items));
    }

    function add(data) {
      var errors = validate(data);
      if (Object.keys(errors).length) {
        return { ok: false, errors: errors }; // rejected: nothing is saved
      }
      var record = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        name: data.name.trim(),
        reg_no: data.reg_no.trim(),
        title: data.title.trim(),
        url: data.url.trim(),
        submitted_at: new Date().toISOString()
      };
      var items = list();
      items.push(record);
      write(items);
      return { ok: true, record: record };
    }

    function remove(id) {
      write(list().filter(function (s) { return s.id !== id; }));
    }

    return { list: list, add: add, remove: remove };
  }

  return { isValidUrl: isValidUrl, validate: validate, createStore: createStore };
});
