'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast-provider';
import type { KYCStatus } from '@/types';

const STEPS = ['Email', 'Profile', 'Documents', 'Review', 'Verified'];

const OCCUPATIONS = ['Employee', 'Self-employed', 'Business Owner', 'Student', 'Retired', 'Other'];
const INCOMES = ['Under 10M VND', '10-30M VND', '30-70M VND', 'Over 70M VND'];
const TRADING_EXP = ['Less than 1 year', '1-3 years', '3-5 years', 'Over 5 years'];
const PURPOSES = ['Investment', 'Trading', 'Savings', 'Remittance', 'Other'];

export default function KYCPage() {
  const { success, error } = useToast();
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeSent, setCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', dateOfBirth: '', phone: '',
    address: '', ward: '', district: '', city: '',
    occupation: '', income: '', tradingExp: '', purpose: '',
  });
  const [uploads, setUploads] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.kyc.status().then((res) => {
      if (res.success && res.data) setKycStatus(res.data);
      setLoading(false);
    });
  }, []);

  const step = kycStatus?.kycStep ?? 0;

  async function handleSendCode() {
    const res = await api.kyc.sendVerifyEmail();
    if (res.success) { success('Verification code sent to your email'); setCodeSent(true); }
    else error(res.message || 'Failed to send code');
  }

  async function handleVerifyEmail() {
    const res = await api.kyc.verifyEmail(emailCode);
    if (res.success) { success('Email verified!'); setKycStatus((s) => s ? { ...s, kycStep: 1 } : s); }
    else error(res.message || 'Invalid code');
  }

  async function handleSubmitProfile() {
    const res = await api.kyc.submitProfile(profile);
    if (res.success) { success('Profile submitted!'); setKycStatus((s) => s ? { ...s, kycStep: 2 } : s); }
    else error(res.message || 'Failed to submit profile');
  }

  async function handleUpload(type: string, file: File) {
    const res = await api.kyc.uploadDocument(type, file);
    if (res.success) {
      success(`${type} uploaded`);
      setUploads((u) => ({ ...u, [type]: true }));
    } else error(res.message || 'Upload failed');
  }

  async function handleSubmitDocs() {
    const res = await api.kyc.status();
    if (res.success && res.data) setKycStatus(res.data);
    success('Documents submitted for review');
  }

  if (loading) return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><span className="text-text-secondary">Loading...</span></div>;

  return (
    <div className="min-h-screen bg-bg-primary py-10 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-bold text-text-primary mb-6">KYC Verification</h1>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                ${i < step ? 'bg-buy text-black' : i === step ? 'bg-accent text-black' : 'bg-bg-tertiary text-text-secondary'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-1 text-[10px] hidden sm:block ${i === step ? 'text-accent' : 'text-text-secondary'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-buy' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Email */}
        {step === 0 && (
          <div className="bg-bg-secondary p-6 border border-border">
            <h2 className="text-base font-semibold text-text-primary mb-2">Verify your email</h2>
            <p className="text-sm text-text-secondary mb-4">We&apos;ll send a verification code to your registered email.</p>
            {!codeSent ? (
              <button onClick={handleSendCode} className="w-full py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors">Send Verification Code</button>
            ) : (
              <div className="space-y-3">
                <input value={emailCode} onChange={(e) => setEmailCode(e.target.value)} placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
                <button onClick={handleVerifyEmail} className="w-full py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors">Verify Code</button>
                <button onClick={handleSendCode} className="w-full text-xs text-text-secondary hover:text-text-primary transition-colors">Resend code</button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="bg-bg-secondary p-6 border border-border space-y-4">
            <h2 className="text-base font-semibold text-text-primary">Personal Information</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['firstName', 'lastName'] as const).map((f) => (
                <input key={f} value={profile[f]} onChange={(e) => setProfile((p) => ({ ...p, [f]: e.target.value }))}
                  placeholder={f === 'firstName' ? 'First Name' : 'Last Name'}
                  className="px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
              ))}
            </div>
            {(['dateOfBirth', 'phone', 'address', 'ward', 'district', 'city'] as const).map((f) => (
              <input key={f} value={profile[f]} onChange={(e) => setProfile((p) => ({ ...p, [f]: e.target.value }))}
                placeholder={f.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                type={f === 'dateOfBirth' ? 'date' : 'text'}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'occupation', opts: OCCUPATIONS },
                { field: 'income', opts: INCOMES },
                { field: 'tradingExp', opts: TRADING_EXP },
                { field: 'purpose', opts: PURPOSES },
              ].map(({ field, opts }) => (
                <select key={field} value={profile[field as keyof typeof profile]}
                  onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                  className="px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent">
                  <option value="">{field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
            </div>
            <button onClick={handleSubmitProfile} className="w-full py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors">Submit Profile</button>
          </div>
        )}

        {/* Step 2: Documents */}
        {step === 2 && (
          <div className="bg-bg-secondary p-6 border border-border space-y-4">
            <h2 className="text-base font-semibold text-text-primary">Upload Documents</h2>
            {[
              { type: 'CCCD_FRONT', label: 'CCCD Front' },
              { type: 'CCCD_BACK', label: 'CCCD Back' },
              { type: 'SELFIE', label: 'Selfie with ID' },
            ].map(({ type, label }) => (
              <div key={type} className="flex items-center justify-between p-3 bg-bg-tertiary border border-border">
                <span className="text-sm text-text-primary">{label}</span>
                {uploads[type] ? (
                  <span className="text-xs text-buy font-semibold">Uploaded</span>
                ) : (
                  <label className="cursor-pointer px-3 py-1.5 bg-accent text-black text-xs font-semibold hover:bg-accent-hover transition-colors">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(type, e.target.files[0]); }} />
                  </label>
                )}
              </div>
            ))}
            {Object.keys(uploads).length === 3 && (
              <button onClick={handleSubmitDocs} className="w-full py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors">Submit for Review</button>
            )}
          </div>
        )}

        {/* Step 3: Under Review */}
        {step === 3 && (
          <div className="bg-bg-secondary p-8 border border-border text-center">
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-accent text-2xl">⏳</span>
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-2">Under Review</h2>
            <p className="text-sm text-text-secondary">Your documents are being reviewed. This usually takes 1-3 business days.</p>
          </div>
        )}

        {/* Step 4: Verified */}
        {step >= 4 && (
          <div className="bg-bg-secondary p-8 border border-border text-center">
            <div className="w-16 h-16 bg-buy/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-buy text-3xl">✓</span>
            </div>
            <h2 className="text-base font-semibold text-buy mb-2">Identity Verified!</h2>
            <p className="text-sm text-text-secondary">Your account is fully verified. You can now access all platform features.</p>
          </div>
        )}
      </div>
    </div>
  );
}
