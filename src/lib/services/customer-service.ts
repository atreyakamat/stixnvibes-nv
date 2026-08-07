import { CustomerRepository } from "@/lib/repositories/customer-repository";

export class CustomerService {
  private repo = new CustomerRepository();

  async getCustomers(params: { search?: string; sortBy?: string; limit?: number }) {
    return this.repo.getCustomerSummaries(params);
  }

  async updateCustomer(id: string, data: any) {
    return this.repo.updateCustomerCrm(id, data);
  }

  async deleteCustomer(id: string) {
    return this.repo.deleteCustomerCrm(id);
  }
}
