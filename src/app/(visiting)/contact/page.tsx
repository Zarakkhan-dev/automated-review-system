import Breadcrumb from "@/components/Common/Breadcrumb";
import Contact from "@/components/Contact";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Automated Review System (ARS)",
  description:
    "Get in touch with the ARS team for support, custom integrations, or partnership inquiries. We're here to help you enhance your business with AI-driven reviews and chatbot support.",
};

const ContactPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Contact ARS"
        description="Have questions or need assistance? Reach out to the Automated Review System team. Whether it's support, feedback, or integration help — we're here to make AI work for you."
      />
      <Contact />
    </>
  );
};

export default ContactPage;
