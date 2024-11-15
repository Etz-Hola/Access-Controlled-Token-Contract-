// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./ERC20.sol";


contract AccessControl {
    address public admin;
    mapping(address => bool) public authorizedMinters;
    
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "AccessControl: caller is not admin");
        _;
    }
    
    modifier onlyMinter() {
        require(authorizedMinters[msg.sender], "AccessControl: caller is not minter");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "AccessControl: new admin is zero address");
        emit AdminChanged(admin, newAdmin);
        admin = newAdmin;
    }
    
    function addMinter(address minter) external onlyAdmin {
        require(minter != address(0), "AccessControl: minter is zero address");
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }
    
    function removeMinter(address minter) external onlyAdmin {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }
}