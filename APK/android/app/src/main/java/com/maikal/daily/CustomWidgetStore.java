package com.maikal.daily;
import android.content.*;
import org.json.*;
import java.util.*;

/** Device-local layout snapshots: editing a widget never changes its neighbours. */
final class CustomWidgetStore {
 static final String[] SIZES={"1x1","1x2","1x3","1x4","2x1","3x1","4x1","2x2","3x3"};
 static final String[] MONEY_VIEWS={"today_summary","today_expense","today_income","today_saving","month_summary","month_expense","month_income","month_saving"};
 static final String[] ACTIONS={"note","transaction","goal","plan"};
 static final String[] LABELS={"Add note","Add transaction","Add goal","Add reminder / meeting"};
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("mantra_custom_widgets",0);}
 static String label(String action){for(int i=0;i<ACTIONS.length;i++)if(ACTIONS[i].equals(action))return LABELS[i];return "Open MANTRA";}
 static int capacity(String size){String[] n=size.split("x");return Math.min(4,Integer.parseInt(n[0])*Integer.parseInt(n[1]));}
 static JSONObject defaults()throws JSONException{return new JSONObject().put("type","shortcuts").put("moneyView","today_summary").put("uid","").put("name","My shortcuts").put("size","2x2").put("appearance","app").put("actions",new JSONArray(Arrays.asList(ACTIONS)));}
 static JSONObject validate(JSONObject input)throws JSONException{
  String size=input.optString("size"),appearance=input.optString("appearance","app"),name=input.optString("name","My shortcuts").trim();
  if(!Arrays.asList(SIZES).contains(size))throw new IllegalArgumentException("Choose a widget size");
  if(!Arrays.asList("app","light","dark","transparent").contains(appearance))throw new IllegalArgumentException("Choose an appearance");
  if(name.isEmpty()||name.length()>40)throw new IllegalArgumentException("Use a widget name of up to 40 characters");
  String type=input.optString("type","shortcuts"),moneyView=input.optString("moneyView","today_summary");if(!Arrays.asList("shortcuts","money").contains(type))throw new IllegalArgumentException("Choose a widget type");if(!Arrays.asList(MONEY_VIEWS).contains(moneyView))throw new IllegalArgumentException("Choose a money figure");if("money".equals(type)&&moneyView.endsWith("summary")&&capacity(size)<3)throw new IllegalArgumentException("Choose at least three cells for a full summary, or show a single figure");
  JSONArray actions=input.optJSONArray("actions");if(actions==null)actions=new JSONArray();if("shortcuts".equals(type)&&(actions.length()<1||actions.length()>capacity(size)))throw new IllegalArgumentException("Choose 1 to "+capacity(size)+" actions for this size");
  Set<String> seen=new HashSet<>();for(int i=0;i<actions.length();i++)if(!Arrays.asList(ACTIONS).contains(actions.getString(i))||!seen.add(actions.getString(i)))throw new IllegalArgumentException("Choose each action only once");
  return new JSONObject().put("type",type).put("moneyView",moneyView).put("uid",input.optString("uid","")).put("name",name).put("size",size).put("appearance",appearance).put("actions",new JSONArray(actions.toString()));
 }
 static JSONObject widget(Context c,int id){try{String value=prefs(c).getString("widget_"+id,null);return value==null?null:validate(new JSONObject(value));}catch(Exception e){return null;}}
 static void configure(Context c,int id,JSONObject plan)throws JSONException{if(!prefs(c).edit().putString("widget_"+id,validate(plan).toString()).commit())throw new IllegalStateException("Could not save widget");}
 static String saveLayout(Context c,JSONObject plan)throws JSONException{JSONObject normalized=validate(plan);JSONObject saved=layouts(c);java.util.Iterator<String> keys=saved.keys();while(keys.hasNext()){String key=keys.next();if(saved.optJSONObject(key)!=null&&saved.optJSONObject(key).toString().equals(normalized.toString()))return key;}String id=UUID.randomUUID().toString();saved.put(id,normalized);if(!prefs(c).edit().putString("layouts",saved.toString()).commit())throw new IllegalStateException("Could not save layout");return id;}
 static JSONObject layouts(Context c){try{return new JSONObject(prefs(c).getString("layouts","{}"));}catch(Exception e){return new JSONObject();}}
 static void delete(Context c,int id){prefs(c).edit().remove("widget_"+id).apply();}
}
