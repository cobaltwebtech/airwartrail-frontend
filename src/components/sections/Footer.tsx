import { useEffect } from "react";
import { siteMeta } from "@/lib/siteData";

interface FooterItem {
  title: string;
  url: string;
}
//Array for footer menu items
const footerItems: Array<FooterItem> = [
  { title: "About", url: "/about" },
  { title: "Contact", url: "/contact" },
  { title: "Privacy Policy", url: "/privacy-policy" },
  { title: "Terms of Service", url: "/terms-of-service" },
];

const Footer = () => {
  useEffect(() => {
    const year = new Date().getFullYear();
    const element = document.getElementById("current-year");
    if (element) {
      element.innerText = year.toString();
    }
  }, []);

  return (
    <footer className="text-light bg-airwar-600 dark:bg-airwar-900 mx-auto mt-12 w-full px-4 py-10 sm:px-6 lg:px-8">
      {/* Grid */}
      <div className="mx-auto grid max-w-screen-lg grid-cols-1 items-center gap-5 md:grid-cols-3">
        <div>
          <p className="mb-2 text-xl font-bold">{siteMeta.title}</p>
          <p className="mb-2 text-sm">
            A subsidiary of Old Segundo Productions
          </p>
          <p className="mb-2 text-sm">
            ©<span id="current-year"></span> - All Rights Reserved
          </p>
        </div>
        {/* End Col */}

        <ul className="mt-5 flex flex-col gap-x-0 gap-y-2 lg:mt-0 lg:flex-row lg:items-center lg:justify-center lg:gap-x-7 lg:gap-y-0">
          {footerItems.map(({ title, url }) => (
            <li key={url}>
              <a
                className="flex items-center justify-start lg:justify-center"
                href={url}
              >
                <span className="text-sm font-light text-nowrap">{title}</span>
              </a>
            </li>
          ))}
        </ul>
        {/* End Col */}

        {/* Social Brands */}
        <div className="flex w-full justify-end">
          <a
            href="https://www.youtube.com/@airwartrail"
            className="size-12"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M22.54 6.42a2.77 2.77 0 0 0-1.945-1.957C18.88 4 12 4 12 4s-6.88 0-8.595.463A2.77 2.77 0 0 0 1.46 6.42C1 8.148 1 11.75 1 11.75s0 3.602.46 5.33a2.77 2.77 0 0 0 1.945 1.958C5.121 19.5 12 19.5 12 19.5s6.88 0 8.595-.462a2.77 2.77 0 0 0 1.945-1.958c.46-1.726.46-5.33.46-5.33s0-3.602-.46-5.33M9.75 8.479v6.542l5.75-3.271z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
        {/* End Social Brands */}
      </div>
      {/* End Grid */}
    </footer>
  );
};

export default Footer;
