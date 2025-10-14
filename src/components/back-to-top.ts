import { getHTMLElement } from "../elements.ts";

const backToTop = getHTMLElement("back-to-top");
const main = getHTMLElement("main");

export function initBackToTop(): void {
  backToTop.addEventListener("click", () => {
    main.scrollTo({
      top: 0,
      behavior: "instant",
    });
  });

  // Once the user has scrolled away from the top of the page, show this element. (And hide it when
  // the user has scrolled back to the top.)
  main.addEventListener("scroll", () => {
    const scrollPosition = main.scrollTop;
    backToTop.classList.toggle("show", scrollPosition > 300);
  });
}
