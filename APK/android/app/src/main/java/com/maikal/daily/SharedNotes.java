package com.maikal.daily;

import android.content.*;
import org.json.*;
import java.util.UUID;

/** Durable share inbox. Acknowledged only after JS saves locally or the user discards. */
public final class SharedNotes {
    private static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("maikal_shared_notes_v1",Context.MODE_PRIVATE);}
    static synchronized void capture(Context c,Intent intent){
        if(intent==null||!Intent.ACTION_SEND.equals(intent.getAction())||intent.getType()==null||!intent.getType().startsWith("text/"))return;
        CharSequence content=intent.getCharSequenceExtra(Intent.EXTRA_TEXT);if(content==null||content.toString().trim().isEmpty())return;
        if(content.length()>20000){android.widget.Toast.makeText(c,"This shared text is too long. Share a shorter note or link.",android.widget.Toast.LENGTH_LONG).show();return;}
        try{
            String id=intent.getStringExtra("maikalShareId");if(id==null){id=UUID.randomUUID().toString();intent.putExtra("maikalShareId",id);}
            JSONArray queue=new JSONArray(prefs(c).getString("pending","[]")),done=new JSONArray(prefs(c).getString("handled","[]"));
            for(int i=0;i<queue.length();i++)if(id.equals(queue.getJSONObject(i).getString("id")))return;
            for(int i=0;i<done.length();i++)if(id.equals(done.getString(i)))return;
            if(queue.length()>=30){android.widget.Toast.makeText(c,"Save or discard your pending shared notes before sharing more.",android.widget.Toast.LENGTH_LONG).show();return;}
            String title=intent.getStringExtra(Intent.EXTRA_SUBJECT);if(title==null)title="";if(title.length()>150)title=title.substring(0,150);
            queue.put(new JSONObject().put("id",id).put("text",content.toString()).put("title",title));
            if(!prefs(c).edit().putString("pending",queue.toString()).commit())throw new IllegalStateException("Share storage unavailable");
        }catch(Exception e){android.widget.Toast.makeText(c,"Could not save the shared draft. Please try sharing again.",android.widget.Toast.LENGTH_LONG).show();}
    }
    static synchronized JSONObject pending(Context c)throws Exception{JSONArray queue=new JSONArray(prefs(c).getString("pending","[]"));return queue.length()>0?queue.getJSONObject(0):null;}
    static synchronized void acknowledge(Context c,String id)throws Exception{
        JSONArray queue=new JSONArray(prefs(c).getString("pending","[]")),next=new JSONArray(),done=new JSONArray(prefs(c).getString("handled","[]"));boolean found=false;
        for(int i=0;i<queue.length();i++){JSONObject item=queue.getJSONObject(i);if(id.equals(item.getString("id")))found=true;else next.put(item);}
        if(!found)return;done.put(id);JSONArray recent=new JSONArray();for(int i=Math.max(0,done.length()-100);i<done.length();i++)recent.put(done.getString(i));
        if(!prefs(c).edit().putString("pending",next.toString()).putString("handled",recent.toString()).commit())throw new IllegalStateException("Could not acknowledge share");
    }
}
