import { CustomerRepository } from "@/lib/repositories/customer-repository";

export class CustomerService {
  private repo = new CustomerRepository();

  async getCustomers(params: { search?: string; sortBy?: string; limit?: number }) {
    return this.repo.getCustomerSummaries(params);
  }
}
