import AboutSectionOne from "@/components/About/AboutSectionOne";
import AboutSectionTwo from "@/components/About/AboutSectionTwo";
import Breadcrumb from "@/components/Common/Breadcrumb";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Automated Review System (ARS)",
  description:
    "Learn more about Automated Review System (ARS) — an AI-powered platform offering intelligent product reviews and real-time chatbot support to elevate customer trust and engagement.",
};


const AboutPage = () => {
  return (
    <>
      <Breadcrumb
          pageName="About ARS"
        description="Automated Review System (ARS) is a cutting-edge AI platform that generates intelligent product reviews and provides real-time chatbot assistance, designed to help businesses boost customer trust, engagement, and conversions."
      />
      <AboutSectionOne />
      <AboutSectionTwo />
    </>
  );
};

export default AboutPage;
