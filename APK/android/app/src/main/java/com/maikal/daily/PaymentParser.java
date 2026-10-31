package com.maikal.daily;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;
import java.util.regex.*;

/** Conservative INR parsing; never retains the original notification. */
public final class PaymentParser {
    public static class Result {
        public final String kind,date,reference; public final long amount;
        Result(String k,long a,String d,String r){kind=k;amount=a;date=d;reference=r;}
    }
    private static boolean has(String text,String pattern){return Pattern.compile(pattern,Pattern.CASE_INSENSITIVE).matcher(text).find();}
    public static Result parse(String input,LocalDate received){
        if(input==null||input.length()>12000)return null;
        String text=input.replace('\u00a0',' ').replaceAll("\\s+"," ").trim();
        if(has(text,"\\b(otp|one[ -]time|verification|failed|failure|declined|pending|processing|requested|request|due|autopay|mandate|cashback|refund|reversed|reversal|offer|win|reward|scheduled|will be|may be)\\b"))return null;
        // Ignore fraud-help suffixes and balances before extracting transaction amounts.
        text=text.split("(?i)(?:not you\\?|available balance|avl[ .]*bal|\\bbal(?:ance)?[ .:]*(?:inr|rs|₹))",2)[0];
        boolean debit=has(text,"\\b(debited|debit|paid|spent|sent|dr)\\b"),credit=has(text,"\\b(credited|credit|received|cr)\\b");
        if(debit==credit)return null;
        Matcher amounts=Pattern.compile("(?i)(?:INR\\s*|Rs\\.?\\s*|₹\\s*)([0-9]+(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?)(?![0-9.]|,\\d)").matcher(text);
        Long amount=null;
        while(amounts.find()){
            long candidate;
            try{candidate=new BigDecimal(amounts.group(1).replace(",","")).movePointRight(2).longValueExact();}catch(Exception e){return null;}
            if(amount!=null)return null; amount=candidate;
        }
        if(amount==null||amount<=0||amount>99999999900L)return null;
        LocalDate date=received;
        Matcher numeric=Pattern.compile("(?i)\\b(?:on|dated|date[: ]*)\\s*(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2}|\\d{4})(?!\\d)").matcher(text);
        Matcher named=Pattern.compile("(?i)\\b(?:on|dated|date[: ]*)\\s*(\\d{1,2})[- ]([a-z]{3})[- ](\\d{4})\\b").matcher(text);
        try{
            if(numeric.find()){int year=Integer.parseInt(numeric.group(3));if(year<100)year+=2000;date=LocalDate.of(year,Integer.parseInt(numeric.group(2)),Integer.parseInt(numeric.group(1)));}
            else if(named.find())date=LocalDate.parse(named.group(1)+"-"+named.group(2)+"-"+named.group(3),new DateTimeFormatterBuilder().parseCaseInsensitive().appendPattern("d-MMM-uuuu").toFormatter(Locale.ENGLISH).withResolverStyle(ResolverStyle.STRICT));
            else if(has(text,"\\b(?:on|dated)\\s+\\d{1,2}[/-]"))return null;
        }catch(Exception e){return null;}
        if(date.isAfter(received)||date.isBefore(received.minusDays(7)))return null;
        Matcher ref=Pattern.compile("(?i)\\b(?:UPI|UTR|RRN|ref(?:erence)?(?:\\s*(?:no|id))?)\\s*[:#.-]?\\s*(\\d{6,30})\\b").matcher(text);
        return new Result(debit?"expense":"income",amount,date.toString(),ref.find()?ref.group(1):"");
    }
}
