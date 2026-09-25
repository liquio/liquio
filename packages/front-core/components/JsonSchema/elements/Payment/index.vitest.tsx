import React from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Payment } from './index';

vi.mock('react-translate', () => ({ translate: () => (component: unknown) => component }));
vi.mock('react-redux', () => ({ connect: () => (component: unknown) => component }));
vi.mock('application/actions/task', () => ({ getPaymentInfo: vi.fn(), getPaymentStatus: vi.fn(), confirmSmsCode: vi.fn(), loadTask: vi.fn() }));
vi.mock('components/JsonSchema/elements/Payment/layout', () => ({ default: () => null }));
vi.mock('components/JsonSchema/elements/Payment/qrLayout', () => ({ default: () => null }));
vi.mock('components/JsonSchema/elements/Payment/phoneLayout', () => ({ default: () => null }));
vi.mock('components/JsonSchema/components/ElementContainer', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('modules/tasks/pages/Task/components/SuccessMessage', () => ({ default: () => null }));
vi.mock('actions/error', () => ({ addMessage: vi.fn() }));
vi.mock('services/processList', () => ({ default: { hasOrSet: vi.fn() } }));

function setup() {
  const ref = React.createRef<Payment>();
  const actions = { getPaymentInfo: vi.fn(), getPaymentStatus: vi.fn(), confirmSmsCode: vi.fn(), loadTask: vi.fn(), addMessage: vi.fn() };
  render(
    <Payment
      ref={ref}
      t={(key: string) => key}
      importActions={actions}
      rootDocument={{ id: 'doc', data: {} }}
      paymentControlPath="payment"
      taskId="task"
      task={{}}
      path={['payment']}
      recipients={{ amount: 10 }}
    />,
  );
  return { component: ref.current!, actions };
}

type ProcessedEntry = { transactionId: string; status: { isSuccess: boolean; isPending?: boolean } };

const paymentResult = (processed: ProcessedEntry[] = [], body = 'data=fresh&signature=sig') => ({
  data: { payment: { calculated: { amount: 10, paymentRequestData: { requestUrl: 'https://provider.example', requestMethod: 'POST', body } }, processed } },
});

describe('Payment checkout refresh', () => {
  it('uses refreshed form fields, never the checkout cached by an old tab', async () => {
    const { component, actions } = setup();
    await act(async () => { void component.parseResult(paymentResult([], 'data=stale')); });
    actions.getPaymentInfo.mockResolvedValue(paymentResult());
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
      expect(new FormData(this).get('data')).toBe('fresh');
    });
    await act(async () => { void component.paymentAction(); });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('does not submit after payment succeeds on another device', async () => {
    const { component, actions } = setup();
    actions.getPaymentInfo.mockResolvedValue(paymentResult([{ transactionId: 'paid', status: { isSuccess: true } }]));
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    await act(async () => { void component.paymentAction(); });
    expect(component.state.isSuccess).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not submit cached data when refreshing fails', async () => {
    const { component, actions } = setup();
    await act(async () => { void component.parseResult(paymentResult()); });
    actions.getPaymentInfo.mockResolvedValue(undefined);
    const submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    await act(async () => { await component.paymentAction(); });
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps success after a delayed failure and treats pending as pending', async () => {
    const { component } = setup();
    await act(async () => { void component.parseResult(paymentResult([{ transactionId: 'pending', status: { isSuccess: false, isPending: true } }])); });
    expect(component.state.paymentFailed).toBe(false);
    await act(async () => { void component.parseResult(paymentResult([
      { transactionId: 'paid', status: { isSuccess: true } },
      { transactionId: 'old', status: { isSuccess: false } },
    ])); });
    expect(component.state.isSuccess).toBe(true);
    await act(async () => { void component.parseResult(paymentResult([{ transactionId: 'old', status: { isSuccess: false } }])); });
    expect(component.state.isSuccess).toBe(true);
  });
});
