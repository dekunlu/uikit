import { TUICallEngine, TUICallEvent } from "tuicall-engine-webrtc";

import { TUICallParam, TUIInitParam, TUIGroupCallParam, RemoteUser, CallbackParam, offlinePushInfoType, statusChangedReturnType } from "./interface";
import {
  status,
  profile,
  callType,
  isFromGroup,
  isMinimized,
  changeStatus,
  updateProfile,
  changeCallType,
  changeRemoteList,
  changeIsFromGroup,
  addRemoteListByUserID,
  updateRemoteVolumeMap,
  removeRemoteListByUserID,
  changeRemoteDeviceByUserID,
  changeIsMinimized
} from './store';
import { STATUS, CHANGE_STATUS_REASON, CALL_TYPE_STRING } from './constants';

/**
 * class TUICallKit
 *
 * TUIGroup 逻辑主体
 */
export default class TUICallKit {
  public tuiCallEngine: any;
  public TUICore: any;
  public beforeCalling: ((...args: any[]) => void) | undefined;
  public afterCalling: ((...args: any[]) => void) | undefined;
  public onMinimized: ((...args: any[]) => void) | undefined;
  public statusChanged: ((...args: any[]) => statusChangedReturnType) | undefined;
  public APIStatus: string | undefined;
  public error: any;
  constructor() {
    this.TUICore = null;
    this.tuiCallEngine = null;
  }

  /**
   * init 初始化
   * @param { TUIInitParam } params 初始化参数
   * @param { number } params.SDKAppID
   * @param { string } params.userID
   * @param { string } params.userSig
   * @param { any= } params.tim
   */
  public async init(params: TUIInitParam) {
    let { SDKAppID, tim } = params;
    const { userID, userSig } = params;
    if (this.TUICore) {
      SDKAppID = this.TUICore.SDKAppID;
      tim = this.TUICore.tim;
    }
    if (this.tuiCallEngine) await this.tuiCallEngine.destroyInstance(); 
    this.tuiCallEngine = TUICallEngine.createInstance({ SDKAppID, tim });
    this.bindTIMEvent();
    try {
      await this.tuiCallEngine.login({ userID, userSig });
      console.log("TUICallKit login successful");
      updateProfile(Object.assign(profile.value, { userID }));
    } catch (error) {
      console.error("TUICallKit login failed", JSON.stringify(error));
      throw new Error(error);
    }
  }

  /**
   * call 呼叫
   * @param { TUICallParam } params 呼叫参数
   * @param { string } params.userID 被呼叫的用户
   * @param { number } params.type 呼叫类型 1-语音，2-视频
   * @param { number= } params.timeout 0为不超时, 单位 s(秒), 默认 30s
   * @param { offlinePushInfoType= } params.offlinePushInfo 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.title 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.description 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.androidOPPOChannelID 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.extension 自定义离线消息推送
   */
  public async call(params: TUICallParam) {
    if (this.APIStatus === "call") {
      return;
    }
    this.APIStatus = "call";
    this.checkStatus();
    const { userID, type, timeout, offlinePushInfo } = params;
    try {
      await this.tuiCallEngine.call({ userID, type, timeout, offlinePushInfo });
      this.beforeCalling && this.beforeCalling("call");
      changeStatus(STATUS.DIALING_C2C);
      changeRemoteList([{ userID, isEntered: false, microphone: false, camera: false }]);
      changeCallType(type);
      changeIsFromGroup(false);
      this.APIStatus = "";
    } catch (error: any) {
      this.beforeCalling && this.beforeCalling("call", this.error);
      this.error = null;
      this.APIStatus = "";
      console.error("TUICallKit call error: " + JSON.stringify(error));
      throw new Error(error);
    }
  }

  /**
   * groupCall 呼叫
   * @param { TUIGroupCallParam } params 呼叫参数
   * @param { string } params.userIDList 被呼叫的用户列表
   * @param { number } params.type 呼叫类型 1-语音，2-视频
   * @param { string } params.groupID 呼叫群组ID
   * @param { number= } params.timeout 0为不超时, 单位 s(秒), 默认 30s
   * @param { offlinePushInfoType= } params.offlinePushInfo 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.title 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.description 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.androidOPPOChannelID 自定义离线消息推送
   * @param { string= } params.offlinePushInfo.extension 自定义离线消息推送
   */
  public async groupCall(params: TUIGroupCallParam) {
    if (this.APIStatus === "groupCall") {
      return;
    }
    this.APIStatus = "groupCall";
    this.checkStatus();
    const { userIDList, type, groupID, timeout, offlinePushInfo } = params;
    try {
      await this.tuiCallEngine.groupCall({ userIDList, type, groupID, timeout, offlinePushInfo });
      this.beforeCalling && this.beforeCalling("groupCall");
      const newRemoteList: Array<RemoteUser> = [];
      userIDList.forEach((userID: string) => {
        newRemoteList.push({ userID, isEntered: false, microphone: false, camera: false });
      });
      changeRemoteList(newRemoteList);
      changeStatus(STATUS.DIALING_GROUP);
      changeCallType(type);
      changeIsFromGroup(true);
      this.APIStatus = "";
    } catch (error: any) {
      this.beforeCalling && this.beforeCalling("groupCall", this.error);
      this.error = null;
      this.APIStatus = "";
      console.error("TUICallKit groupCall error: " + JSON.stringify(error));
      throw new Error(error);
    }
  }

  private checkStatus() {
    if (status.value !== STATUS.IDLE) {
      throw new Error("TUICallKit 已在通话状态");
    }
    if (!this.tuiCallEngine) {
      throw new Error("TUICallKit 发起通话前需先进行初始化");
    }
  }

  public async getDeviceList(deviceType: string) {
    return await this.tuiCallEngine.getDeviceList(deviceType);
  }

  public async switchDevice(deviceType: string, deviceId: string) {
    try {
      await this.tuiCallEngine.switchDevice({ deviceType, deviceId });
      this.startLocalView("local");
    } catch (error) { 
      console.error("TUICallKit switchDevice error", JSON.stringify(error));
    }
  }

  public bindTUICore(TUICore: any) {
    this.TUICore = TUICore;
  }

  public setCallback(params: CallbackParam) {
    const { beforeCalling, afterCalling, onMinimized } = params;
    (beforeCalling) && (this.beforeCalling = beforeCalling);
    (afterCalling) && (this.afterCalling = afterCalling);
    (onMinimized) && (this.onMinimized = onMinimized);
  }

  public toggleMinimize() {
    console.log("TUICallKit toggleMinimize called", isMinimized.value, "->", !isMinimized.value);
    this.onMinimized && this.onMinimized(isMinimized.value, !isMinimized.value);
    changeIsMinimized(!isMinimized.value);
  }

  public async accept() {
    if (this.APIStatus === "accept") {
      return;
    }
    this.APIStatus = "accept";
    try {
      await this.tuiCallEngine.accept();
      this.getIntoCallingStatus();
    } catch (error) {
      console.error("TUICallKit accept error catch: ", error);
      changeStatus(STATUS.IDLE);
    }
    this.APIStatus = "";
  }

  public async reject() {
    if (this.APIStatus === "reject") {
      return;
    }
    this.APIStatus = "reject";
    try {
      await this.tuiCallEngine.reject();
    } catch (error) {
      console.error("TUICallKit reject error catch: ", error);
    }
    changeStatus(STATUS.IDLE);
    this.APIStatus = "";
  }

  public async startLocalView(local: string) {
    await this.tuiCallEngine.startLocalView({ userID: profile.value.userID, videoViewDomID: local });
  }

  public async startRemoteView(userID: string) {
    await this.tuiCallEngine.startRemoteView({ userID, videoViewDomID: userID });
  }

  public async hangup() {
    if (this.APIStatus === "hangup") {
      return;
    }
    this.APIStatus = "hangup";
    await this.tuiCallEngine.hangup();
    changeStatus(STATUS.IDLE);
    this.APIStatus = "";
  }

  public async openCamera() {
    try {
      await this.tuiCallEngine.openCamera();
      updateProfile(Object.assign(profile.value, { camera: true }));
    } catch (error: any) {
      console.error("TUICallKit openCamera error:", error);
    }
  }

  public async closeCamera() {
    try {
      await this.tuiCallEngine.closeCamera();
      updateProfile(Object.assign(profile.value, { camera: false }));
    } catch (error: any) {
      console.error("TUICallKit closeCamera error:", error);
    }
  }

  public async openMicrophone() {
    try {
      await this.tuiCallEngine.openMicrophone();
      updateProfile(Object.assign(profile.value, { microphone: true }));
    } catch (error: any) {
      console.error("TUICallKit openMicrophone error:", error);
    }
  }

  public async closeMicrophone() {
    try {
      await this.tuiCallEngine.closeMicrophone();
      updateProfile(Object.assign(profile.value, { microphone: false }));
    } catch (error: any) {
      console.error("TUICallKit closeMicrophone error:", error);
    }
  }

  public async setVideoQuality(profile: string) {
    await this.tuiCallEngine.setVideoQuality(profile);
  }

  public async switchCallMediaType() {
    if (this.APIStatus === "switchCallMediaType") {
      return;
    }
    this.APIStatus = "switchCallMediaType";
    try {
      await this.tuiCallEngine.switchCallMediaType(1);
    } catch (error) {
      console.error("TUICallKit switchCallMediaType error:", error);
    }
    this.APIStatus = "";
  }


  public onStatusChanged(statusChanged: (...args: any[]) => statusChangedReturnType) {
    this.statusChanged = statusChanged;
  }

  /**
   * 组件销毁
   */
  public destroyed() {
    this.unbindTIMEvent();
    changeStatus(STATUS.IDLE);
  }

  private getIntoCallingStatus() {
    if (!isFromGroup.value && callType.value === CALL_TYPE_STRING.AUDIO) changeStatus(STATUS.CALLING_C2C_AUDIO);
    if (!isFromGroup.value && callType.value === CALL_TYPE_STRING.VIDEO) changeStatus(STATUS.CALLING_C2C_VIDEO);
    if (isFromGroup.value && callType.value === CALL_TYPE_STRING.AUDIO) changeStatus(STATUS.CALLING_GROUP_AUDIO);
    if (isFromGroup.value && callType.value === CALL_TYPE_STRING.VIDEO) changeStatus(STATUS.CALLING_GROUP_VIDEO);
  }

  /**
   * /////////////////////////////////////////////////////////////////////////////////
   * //
   * //                                    TUICallEngine 事件监听注册接口
   * //
   * /////////////////////////////////////////////////////////////////////////////////
   */

  private bindTIMEvent() {
    this.tuiCallEngine.on(TUICallEvent.ERROR, this.handleError, this);
    this.tuiCallEngine.on(TUICallEvent.SDK_READY, this.handleSDKReady, this);
    this.tuiCallEngine.on(TUICallEvent.INVITED, this.handleInvited, this);
    this.tuiCallEngine.on(TUICallEvent.USER_ACCEPT, this.handleUserAccept, this);
    this.tuiCallEngine.on(TUICallEvent.USER_ENTER, this.handleUserEnter, this);
    this.tuiCallEngine.on(TUICallEvent.USER_LEAVE, this.handleUserLeave, this);
    this.tuiCallEngine.on(TUICallEvent.REJECT, this.handleReject, this);
    this.tuiCallEngine.on(TUICallEvent.NO_RESP, this.handleNoResponse, this);
    this.tuiCallEngine.on(TUICallEvent.LINE_BUSY, this.handleLineBusy, this);
    this.tuiCallEngine.on(TUICallEvent.CALLING_CANCEL, this.handleCallingCancel, this);
    this.tuiCallEngine.on(TUICallEvent.KICKED_OUT, this.handleKickedOut, this);
    this.tuiCallEngine.on(TUICallEvent.CALLING_TIMEOUT, this.handleCallingTimeOut, this);
    this.tuiCallEngine.on(TUICallEvent.CALLING_END, this.handleCallingEnd, this);
    this.tuiCallEngine.on(TUICallEvent.USER_VIDEO_AVAILABLE, this.handleUserVideoAvailable, this);
    this.tuiCallEngine.on(TUICallEvent.USER_AUDIO_AVAILABLE, this.handleUserAudioAvailable, this);
    this.tuiCallEngine.on(TUICallEvent.USER_VOICE_VOLUME, this.handleUserVoiceVolume, this);
    this.tuiCallEngine.on(TUICallEvent.CALL_TYPE_CHANGED, this.handleCallTypeChanged, this);
  }

  private unbindTIMEvent() {
    this.tuiCallEngine.off(TUICallEvent.ERROR, this.handleError, this);
    this.tuiCallEngine.off(TUICallEvent.SDK_READY, this.handleSDKReady, this);
    this.tuiCallEngine.off(TUICallEvent.INVITED, this.handleInvited);
    this.tuiCallEngine.off(TUICallEvent.USER_ACCEPT, this.handleUserAccept);
    this.tuiCallEngine.off(TUICallEvent.USER_ENTER, this.handleUserEnter, this);
    this.tuiCallEngine.off(TUICallEvent.USER_LEAVE, this.handleUserLeave, this);
    this.tuiCallEngine.off(TUICallEvent.REJECT, this.handleReject, this);
    this.tuiCallEngine.off(TUICallEvent.NO_RESP, this.handleNoResponse, this);
    this.tuiCallEngine.off(TUICallEvent.LINE_BUSY, this.handleLineBusy, this);
    this.tuiCallEngine.off(TUICallEvent.CALLING_CANCEL, this.handleCallingCancel, this);
    this.tuiCallEngine.off(TUICallEvent.KICKED_OUT, this.handleKickedOut, this);
    this.tuiCallEngine.off(TUICallEvent.CALLING_TIMEOUT, this.handleCallingTimeOut, this);
    this.tuiCallEngine.off(TUICallEvent.CALLING_END, this.handleCallingEnd, this);
    this.tuiCallEngine.off(TUICallEvent.USER_VIDEO_AVAILABLE, this.handleUserVideoAvailable, this);
    this.tuiCallEngine.off(TUICallEvent.USER_AUDIO_AVAILABLE, this.handleUserAudioAvailable, this);
    this.tuiCallEngine.off(TUICallEvent.USER_VOICE_VOLUME, this.handleUserVoiceVolume, this);
    this.tuiCallEngine.off(TUICallEvent.CALL_TYPE_CHANGED, this.handleCallTypeChanged, this);
  }

  private handleError(event: any) {
    const { code } = event;
    this.error = {
      code,
      type: "",
      message: ""
    };
    switch (code) {
      case 60001: 
        this.error.type = "方法调用失败";
        this.error.message = "switchToAudioCall 调用失败";
        break;
      case 60002:
        this.error.type = "方法调用失败";
        this.error.message = "switchToVideoCall 调用失败";
        break;
      case 60003:
        this.error.type = "权限获取失败";
        this.error.message = "没有可用的麦克风设备";
        break;
      case 60004:
        this.error.type = "权限获取失败";
        this.error.message = "没有可用的摄像头设备";
        break;
      case 60005:
        this.error.type = "权限获取失败";
        this.error.message = "用户禁止使用设备";
        break;
      case 60006:
        this.error.type = "环境检测失败";
        this.error.message = "当前环境不支持webRTC";
        break;
    }
    console.error("TUICallKit Error", JSON.stringify(this.error));
    if (status.value === STATUS.BE_INVITED) {
      this.beforeCalling && this.beforeCalling("invited", this.error);
    }
  }

  private handleSDKReady(event: any) {
    console.log("TUICallKit SDK is ready.", event);
  }

  private handleKickedOut() {
    console.error("TUICallKit Kicked Out", JSON.stringify(event));
  }

  private handleUserVideoAvailable(event: any) {
    const { userID, isVideoAvailable } = event;
    changeRemoteDeviceByUserID(userID, CALL_TYPE_STRING.VIDEO, isVideoAvailable);
  }

  private handleUserAudioAvailable(event: any) {
    const { userID, isAudioAvailable } = event;
    changeRemoteDeviceByUserID(userID, CALL_TYPE_STRING.AUDIO, isAudioAvailable);
  }

  private handleUserVoiceVolume(event: any) {
    const { volumeMap } = event;
    updateRemoteVolumeMap(volumeMap);
  }

  private handleInvited(event: any) {
    console.log("TUICallKit handleInvited", event);
    this.beforeCalling && this.beforeCalling("invited", this.error);
    if (this.error) { 
      this.reject();
      this.error = null;
      return; 
    }
    const { sponsor, isFromGroup, inviteData } = event;
    const { callType } = inviteData;
    changeStatus(STATUS.BE_INVITED);
    changeRemoteList([{ userID: sponsor, isEntered: false }]);
    changeCallType(callType);
    changeIsFromGroup(isFromGroup);
  }

  private handleUserAccept(event: any) {
    console.log("TUICallKit handleUserAccept", event);
    const { userID } = event;
    if (userID !== profile.value.userID) return;
    if (status.value === STATUS.BE_INVITED) return;
    this.getIntoCallingStatus();
  }

  private handleUserEnter(event: any) {
    console.log("TUICallKit handleUserEnter", event);
    const { userID } = event;
    addRemoteListByUserID(userID);
  }

  private handleUserLeave(event: any) {
    console.log("TUICallKit handleUserLeave", event);
    const { userID } = event;
    removeRemoteListByUserID(userID);
  }

  private handleReject(event: any) {
    console.log("TUICallKit handleReject", event);
    const { userID } = event;
    if (status.value === STATUS.BE_INVITED) return;
    if (status.value === STATUS.CALLING_GROUP_AUDIO || status.value === STATUS.CALLING_GROUP_VIDEO || status.value === STATUS.DIALING_GROUP) {
      removeRemoteListByUserID(userID);
      return;
    }
    changeStatus(STATUS.IDLE, CHANGE_STATUS_REASON.REJECT, 1000);
  }

  private handleNoResponse(event: any) {
    console.log("TUICallKit handleNoResponse", event);
    const { userIDList } = event;
    userIDList.forEach((userID: string) => {
      if (removeRemoteListByUserID(userID) <= 0) {
        changeStatus(STATUS.IDLE, CHANGE_STATUS_REASON.NO_RESPONSE, isFromGroup.value ? 0 : 1000);
      }
    });
  }

  private handleLineBusy(event: any) {
    console.log("TUICallKit handleLineBusy", event);
    changeStatus(STATUS.IDLE, CHANGE_STATUS_REASON.LINE_BUSY, 1000);
  }

  private handleCallingCancel(event: any) {
    console.log("TUICallKit handleCallingCancel", event);
    changeStatus(STATUS.IDLE, CHANGE_STATUS_REASON.CALLING_CANCEL, 1000);
  }

  private handleCallingTimeOut(event: any) {
    console.log("TUICallKit handleCallingTimeOut", event);
    const { userIDList } = event;
    userIDList.forEach((userID: string) => {
      if (removeRemoteListByUserID(userID) <= 0 || userID === profile.value.userID) {
        changeStatus(STATUS.IDLE, CHANGE_STATUS_REASON.CALLING_TIMEOUT, isFromGroup.value ? 0 : 1000);
      }
    });
  }

  private handleCallingEnd(event: any) {
    console.log("TUICallKit handleCallingEnd", event);
    changeStatus(STATUS.IDLE);
  }

  private handleCallTypeChanged(event: any) {
    console.log("TUICallKit handleCallTypeChanged", event);
    const { newCallType } = event;
    changeCallType(newCallType);
    changeStatus(STATUS.CALLING_C2C_AUDIO, CHANGE_STATUS_REASON.CALL_TYPE_CHANGED);
  }
}
