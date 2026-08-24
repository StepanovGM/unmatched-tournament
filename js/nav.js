const current = location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".nav-link").forEach((link) => {
  if (link.getAttribute("href") === current) {
    link.classList.add("active");
  }
});
