package com.maikal.daily;
import org.junit.Test;
import java.time.LocalDate;
import static org.junit.Assert.*;
public class PaymentParserTest {
    final LocalDate day=LocalDate.of(2026,10,31);
    @Test public void canaraDebitExcludesBalanceAndFraudHelp(){
        PaymentParser.Result r=PaymentParser.parse("Dear Customer, Acct XXXXX19110 Dr. INR 200.00 on 31/10/26 to NEW SRFS PUM; UPI: 132158775153; Bal INR 7,956.29.Not you?SMS BLOCKUPI to 9901771222-CanaraBank",day);
        assertNotNull(r);assertEquals("expense",r.kind);assertEquals(20000,r.amount);assertEquals("2026-10-31",r.date);assertEquals("132158775153",r.reference);
    }
    @Test public void paidUsesNotificationDate(){PaymentParser.Result r=PaymentParser.parse("₹450 paid to ABC Store via UPI",day);assertNotNull(r);assertEquals(45000,r.amount);assertEquals(day.toString(),r.date);}
    @Test public void creditAndNamedDate(){PaymentParser.Result r=PaymentParser.parse("Your account credited with Rs. 5,000 on 30-Oct-2026",day);assertNotNull(r);assertEquals("income",r.kind);assertEquals(500000,r.amount);assertEquals("2026-10-30",r.date);}
    @Test public void rejectUnsafeAndAmbiguousMessages(){for(String text:new String[]{"OTP 123456 for payment of INR 200","INR 200 payment failed","Payment of INR 200 pending","Request to pay INR 200","Available balance INR 5000","INR 200 debited and INR 100 credited","Paid INR 200 plus INR 50","Pay INR 200 now","₹200 refund credited","₹200 cashback received","₹200 will be debited","INR 200 debited on 32/10/26","INR 200 debited on 01/11/26","INR 200 debited on 01/10/26","INR 0 paid","INR 1,2 debited","INR 200 debited on 31-October-2026"})assertNull(text,PaymentParser.parse(text,day));}
    @Test public void preservesPaise(){assertEquals(123456,PaymentParser.parse("INR 1,234.56 debited",day).amount);}
}
