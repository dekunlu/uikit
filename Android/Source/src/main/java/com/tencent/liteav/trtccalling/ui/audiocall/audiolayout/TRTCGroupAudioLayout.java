package com.tencent.liteav.trtccalling.ui.audiocall.audiolayout;

import android.content.Context;
import android.graphics.Bitmap;
import android.util.AttributeSet;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.tencent.liteav.trtccalling.R;
import com.tencent.liteav.trtccalling.model.util.ImageLoader;
import com.tencent.liteav.trtccalling.ui.common.RoundCornerImageView;

/**
 * 通话界面中，显示单个用户头像的自定义布局
 */
public class TRTCGroupAudioLayout extends RelativeLayout {
    private static final int     MIN_AUDIO_VOLUME = 10;
    private final        Context mContext;

    private RoundCornerImageView mImageHead;
    private TextView             mTextName;
    private ImageView            mImageAudioInput;
    private ImageView            mImgLoading;

    public TRTCGroupAudioLayout(Context context) {
        this(context, null);
    }

    public TRTCGroupAudioLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
        mContext = context;
        inflate(context, R.layout.trtccalling_group_audiocall_item_user_layout, this);
        initView();
    }

    private void initView() {
        mImageHead = (RoundCornerImageView) findViewById(R.id.img_head);
        mTextName = (TextView) findViewById(R.id.tv_name);
        mImageAudioInput = (ImageView) findViewById(R.id.iv_audio_input);
        mImgLoading = (ImageView) findViewById(R.id.img_loading);
        ImageLoader.loadGifImage(mContext, mImgLoading, R.drawable.trtccalling_loading);
    }

    public void setAudioVolume(int vol) {
        if (vol > MIN_AUDIO_VOLUME) {
            mImageAudioInput.setVisibility(VISIBLE);
        } else {
            mImageAudioInput.setVisibility(GONE);
        }
    }

    public void setUserName(String userName) {
        mTextName.setText(userName);
    }

    public void setBitmap(Bitmap bitmap) {
        mImageHead.setImageBitmap(bitmap);
    }

    public RoundCornerImageView getImageView() {
        return mImageHead;
    }

    public void startLoading() {
        mImgLoading.setVisibility(VISIBLE);
    }

    public void stopLoading() {
        mImgLoading.setVisibility(GONE);
    }
}
