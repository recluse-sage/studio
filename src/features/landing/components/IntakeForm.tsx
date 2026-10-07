import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Select, Textarea, TextInput } from "@mantine/core";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import { submitIntake, DEFAULT_INTAKE_ENDPOINT } from "../api";
import { BUSINESS_TYPE_OPTIONS, CONTACT_METHOD_OPTIONS } from "../types";
import type {
  BusinessType,
  ContactMethod,
  IntakeFormValues,
  IntakeSubmitState,
} from "../types";
import { TurnstileWidget, resetTurnstileWidget } from "./TurnstileWidget";
import classes from "./IntakeForm.module.css";

export type IntakeFormProps = {
  endpoint?: string;
  turnstileSiteKey?: string;
  onSuccess?: () => void;
};

const initialValues: IntakeFormValues = {
  businessName: "",
  businessType: "",
  taskDescription: "",
  frequency: "",
  contactMethod: "sms",
  contactValue: "",
  honeypot: "",
};

function validate(values: IntakeFormValues): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (values.businessName.trim().length < 2) {
    errors.businessName = "Add your business name so we know who to reply to.";
  }
  if (!values.businessType) {
    errors.businessType = "Choose the closest business type.";
  }
  if (values.taskDescription.trim().length < 10) {
    errors.taskDescription = "Describe the task in at least 10 characters so we can scope it.";
  }
  const frequency = (values.frequency ?? "").trim();
  if (frequency.length > 0 && frequency.length > 60) {
    errors.frequency = "Keep frequency under 60 characters.";
  }
  if (values.contactValue.trim().length < 3) {
    errors.contactValue = "Add a phone, email, or handle where we can reach you.";
  } else if (
    values.contactMethod === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactValue.trim())
  ) {
    errors.contactValue = "That email looks incomplete. Check it and try again.";
  }
  if (!values.contactMethod) {
    errors.contactMethod = "Choose how we should reply.";
  }
  return errors;
}

export function IntakeForm({
  endpoint = DEFAULT_INTAKE_ENDPOINT,
  turnstileSiteKey,
  onSuccess,
}: IntakeFormProps) {
  const [values, setValues] = useState<IntakeFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [state, setState] = useState<IntakeSubmitState>({ status: "idle" });
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  const siteKey = (turnstileSiteKey ?? "").trim();
  const hasSiteKey = siteKey.length > 0;

  function set<K extends keyof IntakeFormValues>(key: K, value: IntakeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key as string]: undefined }));
  }

  function resetWidget() {
    setToken("");
    setTokenError(null);
    setWidgetKey((n) => n + 1);
    resetTurnstileWidget();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(values);
    setFieldErrors(errors);
    if (!hasSiteKey) {
      setState({
        status: "error",
        message: "Intake is paused. Verification is not set up yet.",
      });
      return;
    }
    if (!token) {
      setTokenError("Complete the verification check below, then send.");
      if (Object.values(errors).some(Boolean)) {
        const firstErrorKey = Object.keys(errors).find((k) => errors[k]);
        if (firstErrorKey) {
          document.getElementById(`intake-${firstErrorKey}`)?.focus();
        }
      } else {
        document.getElementById("intake-verification")?.focus();
      }
      return;
    }
    if (Object.values(errors).some(Boolean)) {
      const firstErrorKey = Object.keys(errors).find((k) => errors[k]);
      if (firstErrorKey) {
        document.getElementById(`intake-${firstErrorKey}`)?.focus();
      }
      return;
    }
    setTokenError(null);
    setState({ status: "sending" });
    const result = await submitIntake(values, { endpoint, turnstileToken: token });
    if (result.ok) {
      setState({ status: "success", message: result.message });
      setValues(initialValues);
      setFieldErrors({});
      resetWidget();
      onSuccess?.();
    } else {
      setState({ status: "error", message: result.message });
    }
  }

  if (state.status === "success") {
    return (
      <section id="intake" className={classes.section} aria-labelledby="intake-title">
        <div className={classes.inner}>
          <div className={classes.success} role="status" aria-live="polite">
            <h2 id="intake-title" className={classes.successTitle}>
              Note received
            </h2>
            <p className={classes.successText}>{state.message}</p>
            <Button
              variant="outline"
              onClick={() => setState({ status: "idle" })}
              className={classes.ghostButton}
            >
              Send another note
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="intake" className={classes.section} aria-labelledby="intake-title">
      <div className={classes.inner}>
        <SectionHeading
          id="intake"
          eyebrow="Intake"
          title="Tell us about the repeating task"
          description="Share the task, business type, and how to reach you. We reply with next steps."
        />

        <form className={classes.form} onSubmit={handleSubmit} noValidate={false} aria-describedby="intake-help">
          <p id="intake-help" className={classes.help}>
            Fields marked with an asterisk are required. No account needed.
          </p>

          <div className={classes.field}>
            <label
              htmlFor="intake-taskDescription"
              id="intake-taskDescription-label"
              className={classes.label}
            >
              What repeating task hurts most <span aria-hidden="true">*</span>
            </label>
            <Textarea
              id="intake-taskDescription"
              name="taskDescription"
              required
              minRows={3}
              autosize={false}
              placeholder="Example: confirming bookings by text takes an hour each day"
              value={values.taskDescription}
              onChange={(e) => set("taskDescription", e.currentTarget.value)}
              error={fieldErrors.taskDescription}
              aria-invalid={Boolean(fieldErrors.taskDescription)}
              aria-labelledby="intake-taskDescription-label"
              classNames={{ root: classes.controlRoot, input: classes.input }}
            />
          </div>

          <div className={classes.row}>
            <div className={classes.field}>
              <label
                htmlFor="intake-frequency"
                id="intake-frequency-label"
                className={classes.label}
              >
                How often, optional
              </label>
              <TextInput
                id="intake-frequency"
                name="frequency"
                placeholder="Daily, weekly, each booking"
                value={values.frequency}
                onChange={(e) => set("frequency", e.currentTarget.value)}
                error={fieldErrors.frequency}
                aria-invalid={Boolean(fieldErrors.frequency)}
                aria-labelledby="intake-frequency-label"
                classNames={{ root: classes.controlRoot, input: classes.input }}
              />
            </div>
            <div className={classes.field}>
              <label
                htmlFor="intake-businessType"
                id="intake-businessType-label"
                className={classes.label}
              >
                Business type <span aria-hidden="true">*</span>
              </label>
              <Select
                id="intake-businessType"
                name="businessType"
                required
                data={BUSINESS_TYPE_OPTIONS}
                placeholder="Choose the closest fit"
                value={values.businessType || null}
                onChange={(v) => set("businessType", ((v as BusinessType) ?? "") as BusinessType | "")}
                error={fieldErrors.businessType}
                aria-invalid={Boolean(fieldErrors.businessType)}
                aria-labelledby="intake-businessType-label"
                classNames={{ root: classes.controlRoot, input: classes.input }}
              />
            </div>
          </div>

          <div className={classes.row}>
            <div className={classes.field}>
              <label
                htmlFor="intake-businessName"
                id="intake-businessName-label"
                className={classes.label}
              >
                Business name <span aria-hidden="true">*</span>
              </label>
              <TextInput
                id="intake-businessName"
                name="businessName"
                required
                autoComplete="organization"
                placeholder="Shop or studio name"
                value={values.businessName}
                onChange={(e) => set("businessName", e.currentTarget.value)}
                error={fieldErrors.businessName}
                aria-invalid={Boolean(fieldErrors.businessName)}
                aria-labelledby="intake-businessName-label"
                classNames={{ root: classes.controlRoot, input: classes.input }}
              />
            </div>
            <div className={classes.field}>
              <label
                htmlFor="intake-contactMethod"
                id="intake-contactMethod-label"
                className={classes.label}
              >
                Best reply channel <span aria-hidden="true">*</span>
              </label>
              <Select
                id="intake-contactMethod"
                name="contactMethod"
                required
                data={CONTACT_METHOD_OPTIONS}
                value={values.contactMethod}
                onChange={(v) =>
                  set("contactMethod", ((v as ContactMethod) ?? "sms") as ContactMethod)
                }
                error={fieldErrors.contactMethod}
                aria-invalid={Boolean(fieldErrors.contactMethod)}
                aria-labelledby="intake-contactMethod-label"
                classNames={{ root: classes.controlRoot, input: classes.input }}
              />
            </div>
          </div>

          <div className={classes.field}>
            <label
              htmlFor="intake-contactValue"
              id="intake-contactValue-label"
              className={classes.label}
            >
              Best contact <span aria-hidden="true">*</span>
            </label>
            <TextInput
              id="intake-contactValue"
              name="contactValue"
              required
              autoComplete="tel"
              placeholder="Phone, email, or handle"
              value={values.contactValue}
              onChange={(e) => set("contactValue", e.currentTarget.value)}
              error={fieldErrors.contactValue}
              aria-invalid={Boolean(fieldErrors.contactValue)}
              aria-labelledby="intake-contactValue-label"
              classNames={{ root: classes.controlRoot, input: classes.input }}
            />
          </div>

          <div className={`${classes.field} ${classes.verify}`} id="intake-verification" tabIndex={-1}>
            <span className={classes.label} id="intake-verification-label">
              Verification <span aria-hidden="true" className={classes.required}>*</span>
            </span>
            {hasSiteKey ? (
              <div className={classes.turnstileBox}>
                <TurnstileWidget
                  key={widgetKey}
                  siteKey={siteKey}
                  onToken={(t) => {
                    setToken(t);
                    setTokenError(null);
                  }}
                  onExpired={() => setToken("")}
                  onError={() => setToken("")}
                />
              </div>
            ) : (
              <p role="status" className={classes.verifyNote}>
                Verification is not set up yet. Intake is paused until the owner adds a site key.
              </p>
            )}
            {tokenError ? (
              <span role="alert" className={classes.fieldError}>{tokenError}</span>
            ) : null}
          </div>

          {/* Honeypot for spam bots. Hidden from sighted and assistive users. */}
          <div className={classes.honeypot} aria-hidden="true">
            <label htmlFor="intake-website">
              Website
              <input
                id="intake-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={values.honeypot ?? ""}
                onChange={(e) => set("honeypot", e.currentTarget.value)}
              />
            </label>
          </div>

          {state.status === "error" ? (
            <Alert color="red" variant="light" role="alert" className={classes.alert}>
              {state.message}
            </Alert>
          ) : null}

          <div className={classes.submitRow}>
            <Button
              type="submit"
              size="lg"
              loading={state.status === "sending"}
              disabled={state.status === "sending" || !hasSiteKey}
              className={classes.submit}
            >
              {state.status === "sending" ? "Sending" : "Send intake"}
            </Button>
            <p className={classes.privacy}>
              Your details are used to review and reply to this request. The verification check runs on the server.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
