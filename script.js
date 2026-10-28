(function () {
  "use strict";

  // localStorage can fail (private mode), so wrap it and fall back to memory.
  var memory = {};
  var safeStorage = {
    getItem: function (k) {
      try { return localStorage.getItem(k); } catch (e) { return memory[k] || null; }
    },
    setItem: function (k, v) {
      memory[k] = v;
      try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
    }
  };
  var store = Portal.createStore(safeStorage);

  var form = document.getElementById("form");
  var feedback = document.getElementById("feedback");
  var list = document.getElementById("list");
  var empty = document.getElementById("empty");
  var search = document.getElementById("search");
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");

  function showFeedback(type, text) {
    feedback.hidden = false;
    feedback.className = "feedback " + type;
    feedback.textContent = text;
  }

  function clearErrors() {
    feedback.hidden = true;
    form.querySelectorAll(".err").forEach(function (e) { e.textContent = ""; });
    form.querySelectorAll("input").forEach(function (e) { e.classList.remove("invalid"); });
  }

  function showErrors(errors) {
    Object.keys(errors).forEach(function (field) {
      var msg = form.querySelector('.err[data-for="' + field + '"]');
      if (msg) msg.textContent = errors[field];
      var input = form.elements[field];
      if (input) input.classList.add("invalid");
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // textContent prevents HTML injection
    return node;
  }

  function render() {
    var items = store.list();
    var q = search.value.trim().toLowerCase();
    var shown = items.filter(function (s) {
      return !q || [s.name, s.reg_no, s.title].join(" ").toLowerCase().indexOf(q) !== -1;
    });

    list.innerHTML = "";
    shown.slice().reverse().forEach(function (s) {
      var card = el("article", "card sub");
      var del = el("button", "del", "×");
      del.title = "Delete submission";
      del.setAttribute("aria-label", "Delete submission");
      del.addEventListener("click", function () { store.remove(s.id); render(); });

      var link = el("a", "link", s.url);
      link.href = s.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      card.appendChild(del);
      card.appendChild(el("h3", "", s.title));
      card.appendChild(el("div", "who", s.name + " · " + s.reg_no));
      card.appendChild(link);
      card.appendChild(el("span", "badge", "Saved"));
      card.appendChild(el("div", "meta", new Date(s.submitted_at).toLocaleString()));
      list.appendChild(card);
    });

    empty.hidden = shown.length > 0;
    empty.textContent = items.length && !shown.length
      ? "No submissions match your search."
      : "No submissions yet. Be the first to submit!";

    document.getElementById("statTotal").textContent = items.length;
    var students = {};
    items.forEach(function (s) { students[s.reg_no.toLowerCase()] = true; });
    document.getElementById("statStudents").textContent = Object.keys(students).length;
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    clearErrors();
    var result = store.add({
      name: form.elements.name.value,
      reg_no: form.elements.reg_no.value,
      title: form.elements.title.value,
      url: form.elements.url.value
    });
    if (!result.ok) {
      showErrors(result.errors);
      showFeedback("error", "Submission rejected. Please fix the highlighted fields.");
      return;
    }
    form.reset();
    showFeedback("success", "Submission saved successfully.");
    render();
    document.getElementById("submissions").scrollIntoView({ behavior: "smooth" });
  });

  form.addEventListener("input", function (ev) {
    ev.target.classList.remove("invalid");
    var msg = form.querySelector('.err[data-for="' + ev.target.name + '"]');
    if (msg) msg.textContent = "";
  });

  search.addEventListener("input", render);

  menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.addEventListener("click", function (ev) {
    if (ev.target.tagName === "A") {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  render();
})();
