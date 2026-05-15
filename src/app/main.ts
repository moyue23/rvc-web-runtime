import "./styles/main.css";
import { marked } from "marked";
import DOMPurify from "dompurify";

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}

async function loadDocs(): Promise<void> {
  const docsContainer = byId<HTMLDivElement>("docs-content");
  try {
    const lang = navigator.language.toLowerCase();
    const docPath = lang.startsWith("zh") ? "/docs/api.zh-CN.md" : "/docs/api.md";
    const response = await fetch(docPath);
    if (!response.ok) {
      throw new Error(`Failed to load docs: ${response.status}`);
    }
    const markdown = await response.text();
    const html = await marked.parse(markdown);
    docsContainer.innerHTML = DOMPurify.sanitize(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    docsContainer.innerHTML = `<p style="color: red">Failed to load documentation: ${message}</p>`;
  }
}

function initNavigation(): void {
  const navLinks = document.querySelectorAll(".nav-link");
  const tabContents = document.querySelectorAll(".tab-content");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute("data-tab");
      if (!targetTab) return;

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });
}

function setupFileInputs(): void {
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach((input) => {
    const fileInput = input as HTMLInputElement;
    const label = fileInput.previousElementSibling as HTMLLabelElement;
    if (!label) return;

    const originalText = label.textContent ?? "";

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      label.textContent = file ? `${originalText}: ${file.name}` : originalText;
    });
  });
}

initNavigation();
setupFileInputs();
void loadDocs();

// TODO: Add back after worker commit
// byId<HTMLButtonElement>("run").addEventListener("click", () => {
//   void onRun();
// });
