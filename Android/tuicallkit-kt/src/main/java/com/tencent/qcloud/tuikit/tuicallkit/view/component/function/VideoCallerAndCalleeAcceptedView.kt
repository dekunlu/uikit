package com.tencent.qcloud.tuikit.tuicallkit.view.component.function

import android.content.Context
import android.view.LayoutInflater
import android.widget.ImageView
import android.widget.TextView
import androidx.constraintlayout.motion.widget.MotionLayout
import com.tencent.qcloud.tuikit.TUICommonDefine
import com.tencent.qcloud.tuikit.tuicallengine.TUICallDefine
import com.tencent.qcloud.tuikit.tuicallengine.impl.base.Observer
import com.tencent.qcloud.tuikit.tuicallkit.R
import com.tencent.qcloud.tuikit.tuicallkit.view.root.BaseCallView
import com.tencent.qcloud.tuikit.tuicallkit.viewmodel.component.function.VideoCallerAndCalleeAcceptedViewModel

class VideoCallerAndCalleeAcceptedView(context: Context) : BaseCallView(context) {
    private var rootLayout: MotionLayout? = null
    private var imageOpenCamera: ImageView? = null
    private var imageMute: ImageView? = null
    private var imageAudioDevice: ImageView? = null
    private var imageHangup: ImageView? = null
    private var imageSwitchCamera: ImageView? = null
    private var imageExpandView: ImageView? = null
    private var imageBlurBackground: ImageView? = null
    private var textMute: TextView? = null
    private var textAudioDevice: TextView? = null
    private var textCamera: TextView? = null

    private var viewModel = VideoCallerAndCalleeAcceptedViewModel()

    private var isCameraOpenObserver = Observer<Boolean> {
        imageOpenCamera?.isActivated = it
        textCamera?.text = if (it) {
            context.getString(R.string.tuicallkit_toast_enable_camera)
        } else {
            context.getString(R.string.tuicallkit_toast_disable_camera)
        }

        if (it && viewModel.scene.get() == TUICallDefine.Scene.SINGLE_CALL) {
            refreshButton(R.id.iv_function_switch_camera, VISIBLE)
            refreshButton(R.id.img_blur_background, if (viewModel.isShowVirtualBackgroundButton) VISIBLE else GONE)
        } else {
            refreshButton(R.id.iv_function_switch_camera, GONE)
            refreshButton(R.id.img_blur_background, GONE)
        }
    }

    private fun refreshButton(resId: Int, enable: Int) {
        rootLayout?.getConstraintSet(R.id.start)?.getConstraint(resId)?.propertySet?.visibility = enable
        rootLayout?.getConstraintSet(R.id.end)?.getConstraint(resId)?.propertySet?.visibility = enable
    }

    private var isMicMuteObserver = Observer<Boolean> {
        imageMute?.isActivated = it
    }

    private var isSpeakerObserver = Observer<Boolean> {
        imageAudioDevice?.isActivated = it
    }

    private val isBottomViewExpandedObserver = Observer<Boolean> {
        updateView(it)
        enableSwipeFunctionView(true)
    }

    init {
        initView()

        addObserver()
    }

    override fun clear() {
        removeObserver()
        viewModel.removeObserver()
    }

    private fun addObserver() {
        viewModel.isCameraOpen.observe(isCameraOpenObserver)
        viewModel.isMicMute.observe(isMicMuteObserver)
        viewModel.isSpeaker.observe(isSpeakerObserver)
        viewModel.isBottomViewExpanded.observe(isBottomViewExpandedObserver)
    }

    private fun removeObserver() {
        viewModel.isCameraOpen.removeObserver(isCameraOpenObserver)
        viewModel.isMicMute.removeObserver(isMicMuteObserver)
        viewModel.isSpeaker.removeObserver(isSpeakerObserver)
        viewModel.isBottomViewExpanded.removeObserver(isBottomViewExpandedObserver)
    }

    private fun initView() {
        LayoutInflater.from(context).inflate(R.layout.tuicallkit_function_view_video, this)
        rootLayout = findViewById(R.id.cl_view_video)
        imageMute = findViewById(R.id.iv_mute)
        textMute = findViewById(R.id.tv_mic)
        imageAudioDevice = findViewById(R.id.iv_speaker)
        textAudioDevice = findViewById(R.id.tv_speaker)
        imageOpenCamera = findViewById(R.id.iv_camera)
        imageHangup = findViewById(R.id.iv_hang_up)
        textCamera = findViewById(R.id.tv_video_camera)
        imageSwitchCamera = findViewById(R.id.iv_function_switch_camera)
        imageBlurBackground = findViewById(R.id.img_blur_background)
        imageExpandView = findViewById(R.id.iv_expanded)
        imageExpandView?.visibility = INVISIBLE

        imageOpenCamera?.isActivated = viewModel.isCameraOpen.get() == true
        imageMute?.isActivated = viewModel.isMicMute.get() == true
        imageAudioDevice?.isActivated = viewModel.isSpeaker.get() == true

        textCamera?.text = if (viewModel.isCameraOpen.get()) {
            context.getString(R.string.tuicallkit_toast_enable_camera)
        } else {
            context.getString(R.string.tuicallkit_toast_disable_camera)
        }

        textAudioDevice?.text = if (viewModel.isSpeaker.get() == true) {
            context.getString(R.string.tuicallkit_toast_speaker)
        } else {
            context.getString(R.string.tuicallkit_toast_use_earpiece)
        }

        if (viewModel.scene.get() == TUICallDefine.Scene.SINGLE_CALL && viewModel.isCameraOpen.get()) {
            imageSwitchCamera?.visibility = VISIBLE
            imageBlurBackground?.visibility = if (viewModel.isShowVirtualBackgroundButton) VISIBLE else GONE
        } else {
            imageSwitchCamera?.visibility = GONE
            imageBlurBackground?.visibility = GONE
        }

        if (!viewModel.isBottomViewExpanded.get() && viewModel.showLargerViewUserId.get() != null) {
            viewModel.updateView()
        }
        initViewListener()
        enableSwipeFunctionView(false)
    }

    private fun enableSwipeFunctionView(enable: Boolean) {
        if (viewModel.scene.get() == TUICallDefine.Scene.SINGLE_CALL) {
            rootLayout?.enableTransition(R.id.video_function_view_transition, false)
            return
        }
        rootLayout?.enableTransition(R.id.video_function_view_transition, enable)
    }

    private fun initViewListener() {
        imageMute?.setOnClickListener {
            val resId = if (viewModel.isMicMute.get() == true) {
                viewModel.openMicrophone()
                R.string.tuicallkit_toast_disable_mute
            } else {
                viewModel.closeMicrophone()
                R.string.tuicallkit_toast_enable_mute
            }
            textMute?.text = context.getString(resId)
        }
        imageAudioDevice?.setOnClickListener {
            val resId = if (viewModel.isSpeaker.get() == true) {
                viewModel.selectAudioPlaybackDevice(TUICommonDefine.AudioPlaybackDevice.Earpiece)
                R.string.tuicallkit_toast_use_earpiece
            } else {
                viewModel.selectAudioPlaybackDevice(TUICommonDefine.AudioPlaybackDevice.Speakerphone)
                R.string.tuicallkit_toast_speaker
            }
            textAudioDevice?.text = context.getString(resId)
        }
        imageOpenCamera?.setOnClickListener {
            if (viewModel.isCameraOpen.get() == true) {
                viewModel.closeCamera()
            } else {
                viewModel.openCamera()
            }
        }
        imageHangup?.setOnClickListener { viewModel.hangup() }

        imageExpandView?.setOnClickListener() {
            viewModel.updateView()
        }

        imageBlurBackground?.setOnClickListener {
            viewModel.setBlurBackground()
        }

        imageSwitchCamera?.setOnClickListener() {
            viewModel.switchCamera()
        }

        rootLayout?.addTransitionListener(object : MotionLayout.TransitionListener {
            override fun onTransitionStarted(motionLayout: MotionLayout, startId: Int, endId: Int) {
                rootLayout?.background = context.resources.getDrawable(R.drawable.tuicallkit_bg_group_call_bottom)
            }

            override fun onTransitionChange(motionLayout: MotionLayout, startId: Int, endId: Int, progress: Float) {}

            override fun onTransitionCompleted(motionLayout: MotionLayout, currentId: Int) {
                rootLayout?.getConstraintSet(R.id.start)?.getConstraint(R.id.iv_expanded)?.propertySet?.visibility =
                    VISIBLE
            }

            override fun onTransitionTrigger(motionLayout: MotionLayout, id: Int, positive: Boolean, progress: Float) {}
        })
    }

    private fun updateView(isExpand: Boolean) {
        if (viewModel.scene?.get() == TUICallDefine.Scene.SINGLE_CALL) {
            return
        }
        if (isExpand) {
            rootLayout?.transitionToStart()
            rootLayout?.getConstraintSet(R.id.start)?.getConstraint(R.id.iv_expanded)?.propertySet?.visibility = VISIBLE
        } else {
            rootLayout?.transitionToEnd()
        }

    }
}