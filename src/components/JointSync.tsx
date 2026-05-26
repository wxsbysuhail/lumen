import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, AlertCircle, Heart, UserPlus, Trash2, Check, X, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface JointSyncProps {
  session: any;
  partnerProfile: any;
  jointLink: any;
  incomingInvite: any;
  outgoingInvite: any;
  transactions: any[];
  onInvite: (email: string) => Promise<void>;
  onAcceptInvite: (inviteId: string) => Promise<void>;
  onDeclineInvite: (inviteId: string) => Promise<void>;
  onUnlink: (linkId: string) => Promise<void>;
  onSettleDebt: () => Promise<void>;
}

export const JointSync: React.FC<JointSyncProps> = ({
  session,
  partnerProfile,
  jointLink,
  incomingInvite,
  outgoingInvite,
  transactions,
  onInvite,
  onAcceptInvite,
  onDeclineInvite,
  onUnlink,
  onSettleDebt,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (emailInput.trim().toLowerCase() === session?.user?.email?.toLowerCase()) {
        throw new Error("You cannot link your account to your own email address.");
      }
      await onInvite(emailInput.trim());
      setSuccessMsg(`Invitation sent to ${emailInput}! Waiting for acceptance.`);
      setEmailInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send invitation. Please verify the email is registered.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate outstanding splits
  // My splits: transactions logged by me where split_with_id is partner's ID and split_settled = false
  // Partner's splits: transactions logged by partner where split_with_id is my ID and split_settled = false
  const myId = session?.user?.id;
  const partnerId = partnerProfile?.id;

  const unsettledSplits = transactions.filter(t => 
    t.split_with_id && 
    !t.split_settled &&
    ((t.user_id === myId && t.split_with_id === partnerId) || 
     (t.user_id === partnerId && t.split_with_id === myId))
  );

  // Calculate who owes whom
  let partnerOwesMe = 0;
  let iOwePartner = 0;

  unsettledSplits.forEach(t => {
    const splitVal = Number(t.split_amount) || (Number(t.amount) / 2);
    if (t.user_id === myId) {
      // I paid, partner owes me
      partnerOwesMe += splitVal;
    } else {
      // Partner paid, I owe partner
      iOwePartner += splitVal;
    }
  });

  const netDebt = partnerOwesMe - iOwePartner;
  const absNet = Math.abs(netDebt);

  const handleSettleSubmit = async () => {
    setLoading(true);
    try {
      await onSettleDebt();
      setSuccessMsg('Balances settled successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to settle balance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--ink-color)', margin: 0 }}>Joint Sync & Splits</h1>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
          Link with a partner · Track shared expenses · Settle balances in one tap
        </p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: 'var(--coral-losses-bg)',
          border: '1px solid rgba(232, 93, 93, 0.2)',
          padding: '12px 16px',
          borderRadius: '12px',
          color: 'var(--coral-losses)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: 'var(--emerald-gains-bg)',
          border: '1px solid rgba(15, 122, 92, 0.2)',
          padding: '12px 16px',
          borderRadius: '12px',
          color: 'var(--emerald-gains)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ACTIVE LINKED PARTNER STATE */}
      {jointLink && partnerProfile ? (
        <div className="grid grid-2 gap-6">
          {/* Partner Chip / Status Card */}
          <div className="card flex flex-col gap-6">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={16} className="text-loss" style={{ fill: 'var(--coral-losses)' }} />
              <span>Joint Connection Active</span>
            </div>

            <div className="flex align-center gap-4" style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              background: 'var(--nav-pill-bg)'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'rgba(232, 93, 93, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem'
              }}>
                {partnerProfile.avatar_url || '✨'}
              </div>
              <div className="flex flex-col" style={{ flex: 1 }}>
                <span style={{ fontWeight: 650, fontSize: '1rem' }}>{partnerProfile.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{partnerProfile.email}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', lineHeight: '1.4' }}>
              Your transactions, recurring expenses, and savings goals are fully synchronized. Any items you choose to split will appear on the settlement board.
            </p>

            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-secondary danger-hover-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  color: 'var(--coral-losses)'
                }}
                onClick={() => {
                  if (confirm(`Are you sure you want to unlink your account from ${partnerProfile.name}?`)) {
                    onUnlink(jointLink.id);
                  }
                }}
              >
                <Trash2 size={13} />
                Unlink Partner
              </button>
            </div>
          </div>

          {/* Settle Up Board */}
          <div className="card flex flex-col gap-6">
            <div className="card-title">Settlement Debt Board</div>

            <div className="flex flex-col align-center justify-center text-center" style={{
              padding: '24px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              background: absNet > 0 ? 'var(--nav-pill-bg)' : 'var(--emerald-gains-bg)',
              gap: '6px'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Net Balance Status
              </span>
              
              {absNet === 0 ? (
                <>
                  <Check size={28} className="text-gain" style={{ margin: '8px 0' }} />
                  <h2 className="num text-gain" style={{ fontSize: '1.6rem', fontWeight: 600 }}>All Settle Up!</h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>No outstanding split balances.</span>
                </>
              ) : (
                <>
                  <div style={{ margin: '8px 0', fontSize: '1.8rem' }}>
                    {netDebt > 0 ? <ArrowUpRight className="text-gain" size={32} /> : <ArrowDownRight className="text-loss" size={32} />}
                  </div>
                  <h2 className={`num ${netDebt > 0 ? 'text-gain' : 'text-loss'}`} style={{ fontSize: '1.8rem', fontWeight: 600 }}>
                    Rs. {absNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span style={{ fontSize: '0.85rem', color: 'var(--ink-color)', fontWeight: 550 }}>
                    {netDebt > 0 
                      ? `${partnerProfile.name} owes you` 
                      : `You owe ${partnerProfile.name}`}
                  </span>
                </>
              )}
            </div>

            {absNet > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px 0', fontSize: '0.88rem' }}
                onClick={handleSettleSubmit}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} style={{ marginRight: '6px' }} />
                Settle Balance & Mark Paid
              </button>
            )}

            {unsettledSplits.length > 0 && (
              <div className="flex flex-col gap-2">
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                  Unsettled Split Items ({unsettledSplits.length})
                </span>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {unsettledSplits.map(t => {
                    const splitVal = Number(t.split_amount) || (Number(t.amount) / 2);
                    const isMyPayment = t.user_id === myId;
                    return (
                      <div key={t.id} className="flex justify-between align-center" style={{
                        padding: '8px 10px',
                        background: 'var(--nav-pill-bg)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.82rem'
                      }}>
                        <div className="flex flex-col">
                          <span style={{ fontWeight: 600 }}>{t.description}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--ink-light)' }}>
                            Paid Rs {Number(t.amount).toLocaleString()} by {isMyPayment ? 'You' : partnerProfile.name}
                          </span>
                        </div>
                        <span className={`num ${isMyPayment ? 'text-gain' : 'text-loss'}`} style={{ fontWeight: 600 }}>
                          {isMyPayment ? '+' : '-'}Rs. {splitVal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LINK ACCOUNT / INVITATION INTERFACE */
        <div className="grid grid-2 gap-6">
          {/* Send invitation card */}
          <div className="card flex flex-col gap-4">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={16} />
              <span>Link with Partner</span>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', lineHeight: '1.4' }}>
              Type your partner's registered email address to send a link invitation. Once they accept, your financial ledgers and savings progress will be synchronized in real-time.
            </p>

            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4" style={{ marginTop: 'var(--space-2)' }}>
              <div className="input-group">
                <label className="input-label">Partner Email Address</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '12px', color: 'var(--ink-light)' }} />
                  <input
                    type="email"
                    placeholder="partner@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
                    required
                    disabled={loading || !!outgoingInvite}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '8px 0', fontSize: '0.85rem' }}
                disabled={loading || !!outgoingInvite || !emailInput}
              >
                Send Invite
              </button>
            </form>

            {outgoingInvite && (
              <div style={{
                marginTop: 'var(--space-2)',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'var(--nav-pill-bg)',
                fontSize: '0.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <span style={{ fontWeight: 550, color: 'var(--ink-muted)' }}>Invitation Pending</span>
                <div className="flex justify-between align-center">
                  <span>Waiting for partner registration/acceptance</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '2px 8px', color: 'var(--coral-losses)' }}
                    onClick={() => onDeclineInvite(outgoingInvite.id)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Incoming invitations card */}
          <div className="card flex flex-col gap-4">
            <div className="card-title">Link Invitations</div>
            
            {incomingInvite ? (
              <div className="flex flex-col gap-4" style={{
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                background: 'var(--nav-pill-bg)'
              }}>
                <div className="flex align-center gap-3">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(15, 122, 92, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem'
                  }}>
                    {incomingInvite.inviter?.avatar_url || '💬'}
                  </div>
                  <div className="flex flex-col">
                    <span style={{ fontWeight: 650, fontSize: '0.92rem' }}>{incomingInvite.inviter?.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>wants to link accounts with you</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    onClick={() => onAcceptInvite(incomingInvite.id)}
                  >
                    <Check size={12} style={{ marginTop: '1px' }} /> Accept
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--coral-losses)' }}
                    onClick={() => onDeclineInvite(incomingInvite.id)}
                  >
                    <X size={12} style={{ marginTop: '1px' }} /> Decline
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2.5rem 0', gap: '8px', color: 'var(--ink-light)' }}>
                <span style={{ fontSize: '1.5rem' }}>💌</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink-muted)' }}>No pending invitations</span>
                <span style={{ fontSize: '0.78rem' }}>When someone sends you a link request, it'll appear here.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
