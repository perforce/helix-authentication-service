#
# Authentication integration test machine(s).
#
Vagrant.configure('2') do |config|
  config.vm.box = 'ubuntu/bionic64'
  config.vm.provider 'virtualbox' do |vb|
    vb.memory = 4096
  end
  config.vm.hostname = 'authen'
  config.vm.network 'private_network', type: 'dhcp'
end
