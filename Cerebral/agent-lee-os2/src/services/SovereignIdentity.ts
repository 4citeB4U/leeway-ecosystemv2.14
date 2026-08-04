export const SovereignIdentity = {
  signRequest: async (data: any) => {
    // Mock signing logic
    return {
      ...data,
      'x-sovereign-signature': 'mock-signature'
    };
  }
};
