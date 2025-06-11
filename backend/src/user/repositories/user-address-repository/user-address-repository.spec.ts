import { UserAddressRepository } from './user-address-repository';

describe('UserAddressRepository', () => {
  it('should be defined', () => {
    expect(new UserAddressRepository()).toBeDefined();
  });
});
