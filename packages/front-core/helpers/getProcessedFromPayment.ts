interface PaymentValue {
  processed?: Array<{ status?: { isSuccess?: number } } | null | undefined>;
}

export default (value: PaymentValue | null | undefined): boolean =>
  value?.processed?.some((v) => v?.status?.isSuccess === 1) || false;
