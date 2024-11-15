// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;



// Main ERC20 token contract inheriting access control
contract CustomToken is AccessControl {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    
    // Admin-only function to mint new tokens
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "CustomToken: mint to zero address");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
    
    // Admin-only function to burn tokens
    function burn(address from, uint256 amount) external onlyAdmin {
        require(balanceOf[from] >= amount, "CustomToken: burn amount exceeds balance");
        
        balanceOf[from] -= amount;
        totalSupply -= amount;
        
        emit Burn(from, amount);
        emit Transfer(from, address(0), amount);
    }
    
    // Regular transfer function for all users
    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }
    
    // Approve function for all users
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    
    // TransferFrom function for approved spenders
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(amount <= allowance[from][msg.sender], "CustomToken: insufficient allowance");
        
        allowance[from][msg.sender] -= amount;
        return _transfer(from, to, amount);
    }
    
    // Internal transfer function with checks
    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(from != address(0), "CustomToken: transfer from zero address");
        require(to != address(0), "CustomToken: transfer to zero address");
        require(balanceOf[from] >= amount, "CustomToken: insufficient balance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    // Internal approve function
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "CustomToken: approve from zero address");
        require(spender != address(0), "CustomToken: approve to zero address");
        
        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // View function to get token information
    function getTokenInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) {
        return (name, symbol, decimals, totalSupply);
    }
}