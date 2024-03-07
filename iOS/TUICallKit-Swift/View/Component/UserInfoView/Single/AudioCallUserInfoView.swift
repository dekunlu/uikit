//
//  AudioCallUserInfoView.swift
//  TUICallKit
//
//  Created by vincepzhang on 2023/2/15.
//

import Foundation

class AudioCallUserInfoView: UIView {
    
    let viewModel = UserInfoViewModel()
    let selfCallStatusObserver = Observer()
    let remoteUserListObserver = Observer()
    let userHeadImageView: UIImageView = {
        let userHeadImageView = UIImageView(frame: CGRect.zero)
        userHeadImageView.layer.masksToBounds = true
        userHeadImageView.layer.cornerRadius = 5.0
        if let image = TUICallKitCommon.getBundleImage(name: "userIcon") {
            userHeadImageView.image = image
        }
        return userHeadImageView
    }()
    
    let userNameLabel: UILabel = {
        let userNameLabel = UILabel(frame: CGRect.zero)
        userNameLabel.textColor = UIColor.t_colorWithHexString(color: "#242424")
        userNameLabel.font = UIFont.boldSystemFont(ofSize: 24.0)
        userNameLabel.backgroundColor = UIColor.clear
        userNameLabel.textAlignment = .center
        return userNameLabel
    }()
    
    let waitingInviteLabel: UILabel = {
        let waitingInviteLabel = UILabel(frame: CGRect.zero)
        waitingInviteLabel.textColor = UIColor.t_colorWithHexString(color: "#242424")
        waitingInviteLabel.font = UIFont.boldSystemFont(ofSize: 14.0)
        waitingInviteLabel.backgroundColor = UIColor.clear
        waitingInviteLabel.textAlignment = .center
        return waitingInviteLabel
    }()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        updateWaitingText()
        setUserImageAndName() 
        registerObserveState()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    deinit {
        viewModel.selfCallStatus.removeObserver(selfCallStatusObserver)
        viewModel.remoteUserList.removeObserver(remoteUserListObserver)
    }
    
    //MARK: UI Specification Processing
    private var isViewReady: Bool = false
    override func didMoveToWindow() {
        super.didMoveToWindow()
        if isViewReady { return }
        constructViewHierarchy()
        activateConstraints()
        isViewReady = true
    }

    func constructViewHierarchy() {
        addSubview(userHeadImageView)
        addSubview(userNameLabel)
        addSubview(waitingInviteLabel)
    }

    func activateConstraints() {
        self.userHeadImageView.snp.makeConstraints { make in
            make.top.centerX.equalTo(self)
            make.size.equalTo(CGSize(width: 120, height: 120))
        }
        
        self.userNameLabel.snp.makeConstraints { make in
            make.top.equalTo(userHeadImageView.snp.bottom).offset(10)
            make.centerX.equalTo(self)
            make.width.equalTo(self)
            make.height.equalTo(30)
        }
        
        self.waitingInviteLabel.snp.makeConstraints { make in
            make.top.equalTo(userNameLabel.snp.bottom).offset(5)
            make.centerX.equalTo(self)
            make.width.equalTo(self)
            make.height.equalTo(20)
        }
    }

    // MARK: Register TUICallState Observer && Update UI
    func registerObserveState() {
        callStatusChange()
        remmoteUserListChanged()
    }
    
    func callStatusChange() {
        viewModel.selfCallStatus.addObserver(selfCallStatusObserver, closure: { [weak self] newValue, _ in
            guard let self = self else { return }
            self.updateWaitingText()
        })
    }
    
    func remmoteUserListChanged() {
        viewModel.remoteUserList.addObserver(remoteUserListObserver, closure: { [weak self] newValue, _ in
            guard let self = self else { return }
            self.setUserImageAndName()
        })
    }
    
    // MARK: Update UI
    func setUserImageAndName() {
        let remoteUser = viewModel.remoteUserList.value.first ?? User()
        userNameLabel.text = User.getUserDisplayName(user: remoteUser)
        
        if let url = URL(string: remoteUser.avatar.value) {
            userHeadImageView.sd_setImage(with: url)
        }
    }

    func updateWaitingText() {
        switch viewModel.selfCallStatus.value {
            case .waiting:
                self.waitingInviteLabel.text =  viewModel.getCurrentWaitingText()
                break
            case .accept:
                self.waitingInviteLabel.text = ""
                break
            case .none:
                break
            default:
                break
        }
    }
}