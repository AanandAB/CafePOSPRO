import socket
import json

def get_local_ip():
    """
    Get the local IPv4 address of the current device
    """
    try:
        # Method 1: Using socket connection to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to a remote server (doesn't actually send data)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"Error getting local IP via socket: {e}")
        return None

def get_network_info():
    """
    Get local IP address
    """
    local_ip = get_local_ip()
    
    return {
        "local_ip": local_ip
    }

if __name__ == "__main__":
    info = get_network_info()
    print(json.dumps(info, indent=2))