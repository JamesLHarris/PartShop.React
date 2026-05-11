import React, { useState } from "react";
import toastr from "toastr";
import contactService from "../service/contactService";
import "./Contact.css";

const initialFormData = {
  inquiryType: "general",
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const inquiryOptions = [
  { value: "general", label: "General Question" },
  { value: "parts", label: "Parts Inquiry" },
  { value: "orders", label: "Order Question" },
  { value: "returns", label: "Return / Refund Request" },
  { value: "shipping", label: "Shipping Question" },
  { value: "wholesale", label: "Wholesale / Business Inquiry" },
  { value: "website", label: "Website Issue" },
];

function Contact() {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFormFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.inquiryType) {
      toastr.error("Please select an inquiry type.");
      return false;
    }

    if (!formData.name.trim()) {
      toastr.error("Please enter your name.");
      return false;
    }

    if (!formData.email.trim()) {
      toastr.error("Please enter your email.");
      return false;
    }

    if (!formData.subject.trim()) {
      toastr.error("Please enter a subject.");
      return false;
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      toastr.error("Please enter a message with at least 10 characters.");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    return {
      inquiryType: formData.inquiryType,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      subject: formData.subject.trim(),
      message: formData.message.trim(),
    };
  };

  const onSubmitContactForm = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    contactService
      .sendContactMessage(buildPayload())
      .then(onSendContactMessageSuccess)
      .catch(onSendContactMessageError)
      .finally(() => setIsSubmitting(false));
  };

  const onSendContactMessageSuccess = () => {
    toastr.success("Your message has been sent.");
    setFormData(initialFormData);
  };

  const onSendContactMessageError = (error) => {
    console.error("Contact form error:", error);
    toastr.error("Unable to send your message right now. Please try again.");
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <h1>Contact Us</h1>
        <p>Send us a message and we will route it to the right department.</p>
      </section>

      <section className="contact-content">
        <form className="contact-form" onSubmit={onSubmitContactForm}>
          <div className="contact-form-group">
            <label htmlFor="inquiryType">What can we help you with?</label>
            <select
              id="inquiryType"
              name="inquiryType"
              value={formData.inquiryType}
              onChange={onFormFieldChange}
            >
              {inquiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="contact-form-row">
            <div className="contact-form-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={onFormFieldChange}
                placeholder="Your name"
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={onFormFieldChange}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="contact-form-row">
            <div className="contact-form-group">
              <label htmlFor="phone">Phone optional</label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={onFormFieldChange}
                placeholder="Optional"
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="subject">Subject</label>
              <input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={onFormFieldChange}
                placeholder="How can we help?"
              />
            </div>
          </div>

          <div className="contact-form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={onFormFieldChange}
              placeholder="Tell us what you need help with..."
              rows="7"
            />
          </div>

          <button
            className="contact-submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </form>

        <aside className="contact-info-card">
          <h2>Company Contact</h2>
          <p>
            Choose the best inquiry type and your message will be routed to the
            correct inbox.
          </p>

          <div className="contact-info-line">
            <strong>Phone:</strong>
            <span>Contact Phone</span>
          </div>

          <div className="contact-info-line">
            <strong>Email:</strong>
            <span>Contact Email</span>
          </div>

          <div className="contact-info-line">
            <strong>Address:</strong>
            <span>Contact Address</span>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default Contact;
