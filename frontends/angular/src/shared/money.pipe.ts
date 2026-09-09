import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney, Money } from './money';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(money: Money): string {
    return formatMoney(money);
  }
}
