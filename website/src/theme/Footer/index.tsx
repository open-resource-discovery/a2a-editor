import React from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";
import "./footer.css";
import { useColorMode } from "@docusaurus/theme-common";

export default function Footer(): React.JSX.Element {
  const euSupportImageUrl = useBaseUrl("img/eu-support.png");
  const neonephosImageUrl = useBaseUrl("img/neonephos.svg");
  const neonephosImageUrlLight = useBaseUrl("img/neonephos-light.svg");

  const { colorMode } = useColorMode();
  const neonephosSrc = colorMode === "light" ? neonephosImageUrlLight : neonephosImageUrl;

  return (
    <footer className="VPFooter">
      <div className="container">
        <div className="funding-notice">
          <div className="funding-image">
            <div className="funding-image-container">
              <div className="funding-image-bg"></div>
              <a href="https://apeirora.eu/" target="_blank" rel="noopener noreferrer">
                <img
                  src={euSupportImageUrl}
                  alt="EU and German government funding logos"
                  className="funding-image-src"
                />
              </a>
            </div>
          </div>
          <div className="funding-text">
            <p>
              <strong>Funded by the European Union – NextGenerationEU.</strong>
            </p>
            <p>
              The views and opinions expressed are solely those of the author(s) and do not necessarily reflect the
              views of the European Union or the European Commission. Neither the European Union nor the European
              Commission can be held responsible for them.
            </p>
            <div className="footer-divider" />
            <div className="copyright">
              <p>
                <strong>Copyright © Linux Foundation Europe.</strong>
              </p>
              A2A Editor is a project developed by SAP to help ensure API guideline compliance. For applicable policies
              including privacy policy, terms of use and trademark usage guidelines, please see{" "}
              <a href="https://www.sap.com/about/legal.html" target="_blank" rel="noopener noreferrer">
                SAP Legal
              </a>
              .
            </div>
          </div>
        </div>
        <div className="neonephos-logos">
          <a href="https://neonephos.org/" target="_blank" rel="noopener noreferrer" className="neonephos-link">
            <img src={neonephosSrc} alt="Neonephos Logo" className="neonephos-logo" />
          </a>
        </div>
      </div>
    </footer>
  );
}
