package com.maikal.daily;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.view.*;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Bundle;

/** Drag the center handle left to snooze, right to stop; incomplete gestures do nothing. */
public final class AlarmSwipeView extends View {
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private float position,downX,downY;private boolean dragging,finished;
    private final java.util.function.Consumer<String> action;
    private static final int SNOOZE_ACTION=View.generateViewId(),STOP_ACTION=View.generateViewId();
    public AlarmSwipeView(Context c,java.util.function.Consumer<String> callback){super(c);action=callback;setTag("alarmSwipe");setFocusable(true);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_YES);setContentDescription("Alarm controls. Swipe left to snooze for five minutes. Swipe right to stop.");}
    private float dp(float x){return x*getResources().getDisplayMetrics().density;}
    private float thumb(){return Math.min(dp(96),getWidth()*.28f);}
    private float travel(){return (getWidth()-thumb())/2f-dp(6);}
    @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float h=getHeight(),w=getWidth(),radius=h/2;
        paint.setColor(0xff222c36);canvas.drawRoundRect(0,0,w,h,radius,radius,paint);
        canvas.save();canvas.clipRect(w/2,0,w,h);paint.setColor(0xff123e60);canvas.drawRoundRect(0,0,w,h,radius,radius,paint);canvas.restore();
        paint.setColor(0xffe2e6ed);paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));paint.setTextSize(dp(16));paint.setTextAlign(Paint.Align.LEFT);float baseline=h/2-(paint.ascent()+paint.descent())/2;canvas.drawText("Snooze",dp(20),baseline,paint);paint.setTextAlign(Paint.Align.RIGHT);canvas.drawText("Stop",w-dp(20),baseline,paint);
        float size=thumb(),cx=w/2+position;paint.setColor(0xff0062a8);canvas.drawRoundRect(cx-size/2,dp(5),cx+size/2,h-dp(5),radius,radius,paint);
        Drawable alarm=getContext().getDrawable(android.R.drawable.ic_lock_idle_alarm);if(alarm!=null){alarm.setTint(0xffe2efff);int half=(int)dp(13);alarm.setBounds((int)cx-half,(int)h/2-half,(int)cx+half,(int)h/2+half);alarm.draw(canvas);}
    }
    @Override public boolean onTouchEvent(MotionEvent e){if(finished)return true;switch(e.getActionMasked()){
        case MotionEvent.ACTION_DOWN:if(Math.abs(e.getX()-getWidth()/2f-position)>thumb()/2+dp(10))return false;downX=e.getX();downY=e.getY();dragging=true;getParent().requestDisallowInterceptTouchEvent(true);return true;
        case MotionEvent.ACTION_MOVE:if(!dragging)return false;if(Math.abs(e.getY()-downY)>dp(45)&&Math.abs(e.getY()-downY)>Math.abs(e.getX()-downX)){reset();return true;}position=Math.max(-travel(),Math.min(travel(),e.getX()-downX));invalidate();return true;
        case MotionEvent.ACTION_UP:if(!dragging)return false;dragging=false;if(Math.abs(position)>=travel()*.76f){finish(position<0?"SNOOZE":"STOP");}else reset();return true;
        case MotionEvent.ACTION_CANCEL:reset();return true;default:return true;}}
    private void reset(){dragging=false;position=0;getParent().requestDisallowInterceptTouchEvent(false);invalidate();}
    private void finish(String command){if(finished)return;finished=true;performHapticFeedback(HapticFeedbackConstants.CONFIRM);action.accept(command);}
    @Override public void onInitializeAccessibilityNodeInfo(AccessibilityNodeInfo info){super.onInitializeAccessibilityNodeInfo(info);info.setClassName("android.widget.SeekBar");info.addAction(new AccessibilityNodeInfo.AccessibilityAction(SNOOZE_ACTION,"Snooze for five minutes"));info.addAction(new AccessibilityNodeInfo.AccessibilityAction(STOP_ACTION,"Stop alarm"));}
    @Override public boolean performAccessibilityAction(int id,Bundle args){if(id==SNOOZE_ACTION||id==STOP_ACTION){finish(id==SNOOZE_ACTION?"SNOOZE":"STOP");return true;}return super.performAccessibilityAction(id,args);}
}
