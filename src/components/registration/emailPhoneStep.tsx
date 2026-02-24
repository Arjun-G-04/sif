import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon, CheckCircle, Mail, PhoneIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { sendOtp, verifyOtp } from "@/services/otp";

interface EmailPhoneStepProps {
	onComplete: (data: { email: string; phone: string }) => void;
}

export function EmailPhoneStep({ onComplete }: EmailPhoneStepProps) {
	// Generate unique IDs
	const emailId = useId();
	const phoneId = useId();

	// Form state
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [emailOtp, setEmailOtp] = useState("");
	const [phoneOtp, setPhoneOtp] = useState("");

	// Verification status
	const [emailVerified, setEmailVerified] = useState(false);
	const [phoneVerified, setPhoneVerified] = useState(false);
	const [emailOtpSent, setEmailOtpSent] = useState(false);
	const [phoneOtpSent, setPhoneOtpSent] = useState(false);

	// Turnstile
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const turnstileRef = useRef<TurnstileInstance>(null);

	// Get site key from environment
	const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

	// Mutations
	const sendEmailMutation = useMutation({
		mutationFn: sendOtp,
		onSuccess: (data) => {
			setEmailOtpSent(true);
			toast.success(data.message);
			turnstileRef.current?.reset();
			setTurnstileToken(null);
		},
		onError: (error) => {
			toast.error(error.message);
			turnstileRef.current?.reset();
			setTurnstileToken(null);
		},
	});

	const sendPhoneMutation = useMutation({
		mutationFn: sendOtp,
		onSuccess: (data) => {
			setPhoneOtpSent(true);
			toast.success(data.message);
			turnstileRef.current?.reset();
			setTurnstileToken(null);
		},
		onError: (error) => {
			toast.error(error.message);
			turnstileRef.current?.reset();
			setTurnstileToken(null);
		},
	});

	const verifyEmailMutation = useMutation({
		mutationFn: verifyOtp,
		onSuccess: (data) => {
			setEmailVerified(true);
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(error.message);
			setEmailOtp("");
		},
	});

	const verifyPhoneMutation = useMutation({
		mutationFn: verifyOtp,
		onSuccess: (data) => {
			setPhoneVerified(true);
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(error.message);
			setPhoneOtp("");
		},
	});

	const handleSendEmailOtp = () => {
		if (!turnstileToken) {
			toast.error("Please complete the security challenge first");
			return;
		}
		if (!email) {
			toast.error("Please enter your email address");
			return;
		}
		sendEmailMutation.mutate({
			data: { type: "email", target: email, turnstileToken },
		});
	};

	const handleSendPhoneOtp = () => {
		if (!turnstileToken) {
			toast.error("Please complete the security challenge first");
			return;
		}
		if (!phone) {
			toast.error("Please enter your phone number");
			return;
		}
		sendPhoneMutation.mutate({
			data: { type: "phone", target: phone, turnstileToken },
		});
	};

	const handleVerifyEmailOtp = () => {
		if (emailOtp.length !== 6) {
			toast.error("Please enter the complete 6-digit OTP");
			return;
		}
		verifyEmailMutation.mutate({
			data: { type: "email", target: email, otp: emailOtp },
		});
	};

	const handleVerifyPhoneOtp = () => {
		if (phoneOtp.length !== 6) {
			toast.error("Please enter the complete 6-digit OTP");
			return;
		}
		verifyPhoneMutation.mutate({
			data: { type: "phone", target: phone, otp: phoneOtp },
		});
	};

	const canProceed = emailVerified && phoneVerified;

	const handleContinue = () => {
		if (canProceed) {
			onComplete({ email, phone });
		}
	};

	return (
		<div className="space-y-6">
			{/* Email Verification */}
			<Field>
				<FieldLabel htmlFor="email">
					<div className="flex items-center gap-2">
						<Mail className="w-4 h-4 text-slate-400" />
						Email Address
						{emailVerified && (
							<CheckCircle className="w-4 h-4 text-green-500" />
						)}
					</div>
				</FieldLabel>
				<FieldContent>
					<div className="flex gap-2">
						<Input
							id={emailId}
							type="email"
							placeholder="Enter your email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={
								emailVerified || sendEmailMutation.isPending
							}
							className={
								emailVerified
									? "border-green-500 bg-green-50"
									: ""
							}
						/>
						{!emailVerified && !emailOtpSent && (
							<Button
								type="button"
								onClick={handleSendEmailOtp}
								disabled={
									!email ||
									!turnstileToken ||
									sendEmailMutation.isPending
								}
								className="shrink-0"
							>
								{sendEmailMutation.isPending ? (
									<Spinner className="w-4 h-4" />
								) : (
									"Send OTP"
								)}
							</Button>
						)}
					</div>

					{emailOtpSent && !emailVerified && (
						<div className="mt-3 space-y-2">
							<p className="text-sm text-slate-600">
								Enter the 6-digit code sent to your email:
							</p>
							<div className="flex items-center gap-3">
								<InputOTP
									maxLength={6}
									value={emailOtp}
									onChange={setEmailOtp}
									disabled={verifyEmailMutation.isPending}
								>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
									</InputOTPGroup>
									<InputOTPSeparator />
									<InputOTPGroup>
										<InputOTPSlot index={3} />
										<InputOTPSlot index={4} />
										<InputOTPSlot index={5} />
									</InputOTPGroup>
								</InputOTP>
								<Button
									type="button"
									onClick={handleVerifyEmailOtp}
									disabled={
										emailOtp.length !== 6 ||
										verifyEmailMutation.isPending
									}
									size="sm"
								>
									{verifyEmailMutation.isPending ? (
										<Spinner className="w-4 h-4" />
									) : (
										"Verify"
									)}
								</Button>
							</div>
						</div>
					)}
				</FieldContent>
			</Field>

			{/* Phone Verification */}
			<Field>
				<FieldLabel htmlFor="phone">
					<div className="flex items-center gap-2">
						<PhoneIcon className="w-4 h-4 text-slate-400" />
						Phone Number
						{phoneVerified && (
							<CheckCircle className="w-4 h-4 text-green-500" />
						)}
					</div>
				</FieldLabel>
				<FieldContent>
					<div className="flex gap-2">
						<Input
							id={phoneId}
							type="tel"
							placeholder="Enter your phone number"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							disabled={
								phoneVerified || sendPhoneMutation.isPending
							}
							className={
								phoneVerified
									? "border-green-500 bg-green-50"
									: ""
							}
						/>
						{!phoneVerified && !phoneOtpSent && (
							<Button
								type="button"
								onClick={handleSendPhoneOtp}
								disabled={
									!phone ||
									!turnstileToken ||
									sendPhoneMutation.isPending
								}
								className="shrink-0"
							>
								{sendPhoneMutation.isPending ? (
									<Spinner className="w-4 h-4" />
								) : (
									"Send OTP"
								)}
							</Button>
						)}
					</div>

					{phoneOtpSent && !phoneVerified && (
						<div className="mt-3 space-y-2">
							<p className="text-sm text-slate-600">
								Enter the 6-digit code sent to your phone:
							</p>
							<div className="flex items-center gap-3">
								<InputOTP
									maxLength={6}
									value={phoneOtp}
									onChange={setPhoneOtp}
									disabled={verifyPhoneMutation.isPending}
								>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
									</InputOTPGroup>
									<InputOTPSeparator />
									<InputOTPGroup>
										<InputOTPSlot index={3} />
										<InputOTPSlot index={4} />
										<InputOTPSlot index={5} />
									</InputOTPGroup>
								</InputOTP>
								<Button
									type="button"
									onClick={handleVerifyPhoneOtp}
									disabled={
										phoneOtp.length !== 6 ||
										verifyPhoneMutation.isPending
									}
									size="sm"
								>
									{verifyPhoneMutation.isPending ? (
										<Spinner className="w-4 h-4" />
									) : (
										"Verify"
									)}
								</Button>
							</div>
						</div>
					)}
				</FieldContent>
			</Field>

			{/* Turnstile Widget */}
			<div className="flex flex-col items-center gap-2 pt-2">
				<p className="text-sm text-slate-500">
					Complete the security challenge if any to send OTPs
				</p>
				{siteKey ? (
					<Turnstile
						ref={turnstileRef}
						siteKey={siteKey}
						onSuccess={(token) => setTurnstileToken(token)}
						onExpire={() => setTurnstileToken(null)}
						onError={() => {
							setTurnstileToken(null);
							toast.error(
								"Security challenge failed. Please try again.",
							);
						}}
					/>
				) : (
					<p className="text-sm text-amber-600">
						Turnstile site key not configured
					</p>
				)}
			</div>

			{/* Navigation Buttons */}
			<div className="flex flex-col sm:flex-row justify-between gap-4">
				<Button
					type="button"
					onClick={handleContinue}
					disabled={!canProceed}
					className="w-full sm:w-auto h-11 bg-blue-600 hover:bg-blue-500 text-white min-w-[200px]"
				>
					Next Step <ArrowRightIcon className="ml-2 w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}
