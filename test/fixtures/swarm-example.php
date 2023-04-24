<?php
/* copied from the swarm documentation with minimal changes */
    return array(
        'activity' => array(
            'ignored_users' => array(
                'p4dtguser',
                'system',
            ),
        ),
        'archives' => array(
            'max_input_size'    => 512 * 1024 * 1024, // 512M (in bytes)
            'archive_timeout'   => 1800,              // 30 minutes
            'compression_level' => 1,                 // 0-9
            'cache_lifetime'    => 60 * 60 * 24,      // 1 day
        ),
        'avatars' => array(
            'http_url'  => 'http://www.gravatar.com/avatar/{hash}?s={size}&d={default}',
            'https_url' => 'https://secure.gravatar.com/avatar/{hash}?s={size}&d={default}',
        ),
        'comments' => array(
             'notification_delay_time'    => 1800, //Default to 30 minutes 1800 seconds 
             'threading'     => array(
                 'max_depth' => 4, // default depth 4, to disable comment threading set to 0
             ),
        ),
        'depot_storage' => array(
            'base_path'  => '//depot_name',
        ),
        'diffs' => array(
            'max_diffs'                  => 1500,
        ),
        'environment' => array(
            'mode'         => 'production',
            'hostname'     => 'myswarm.hostname',
            'external_url' => null,
            'base_url'     => null,
            'logout_url'   => null, // defaults to null
            'vendor'       => array(
                'emoji_path' => 'vendor/gemoji/images',
            ),
        ),
        'files' => array(
            'max_size'         => 1048576,
            'download_timeout' => 1800,
            'allow_edits' => true, // default is true
        ),
        'groups' => array(
            'super_only'  => true, // ['true'|'false'] default value is 'false' 
        ),
        'http_client_options'   => array(
            'timeout'       => 10, // default value is 10 seconds 
            'sslcapath'     => '', // path to the SSL certificate directory
            'sslcert'       => '', // the path to a PEM-encoded SSL certificate
            'sslpassphrase' => '', // the passphrase for the SSL certificate file
            'hosts'         => array(), // optional, per-host overrides. Host as key, array options as values
        ),
        'jira' => array(
            'host'            => '', // URL for your installed Jira web interface (start with https:// or  http://)
            'api_host'        => '', // URL for Jira API access, 'host' is used for Jira API access if 'api_host' is not set
            'user'            => '', // Jira Cloud: the username used to connect to your Atlassian account 
                                     // Jira on-premises: the username required for Jira API access
            'password'        => '', // Jira Cloud: a special API token, obtained from https://id.atlassian.com/manage/api-tokens
                                     // Jira on-premises: the password required for Jira API access
            'job_field'       => '', // optional, if P4DTG is replicating Jira issue IDs to a job field, list that field here
            'link_to_jobs'    => false, // set to true to enable Perforce job links in Jira, P4DTG and job_field required
            'delay_job_links' => 60, // delay in seconds, defaults to 60 seconds
            'relationship'    => '', // Jira subsection name links are added to defaults to empty, links added to the "links to" subsection  
        ),
        'linkify' => array(
            'markdown' => array(
                array(
                    'id'    =>  'jobs',
                    'regex' => '', // the regular expression used to match the job keyword, default is empty
                    'url'   => '', // url that matching job numbers are appended to, default is empty
                ),
            ),
        ),
        'log' => array(
            'priority'     => 3, // 7 for max, defaults to 3
            'reference_id' => false // defaults to false
        ),
        'mail' => array(
            // 'recipients' => array('user@my.domain'),
            'notify_self'   => false,
            'transport' => array(
                'host' => 'my.mx.host',
            ),
        ),
        'markdown' => array(        
            'markdown' => 'safe', // default is 'safe' 'disabled'|'safe'|'unsafe'
        ),
        'mentions' => array(
            'mode'  => 'global',
            'user_exclude_list'  => array('super', 'swarm-admin'),
            'group_exclude_list' => array('testers', 'writers'), // defaults to empty
        ),
        'menu_helpers' => array( 
            'MyMenu01' => array( // A short recognizable name for the menu item
                'id'        => 'custom01',            // A unique id for the menu item. If not included in the array, parent array name is used.
                'enabled'   => true,                  // ['true'|'false'] 'true' makes the menu item visible. 'true' is the default if not included in the array.
                'target'    => '/module/MyMenuItem/', // The URL or custom module route a menu click takes you to.
                                                      // If not included in array, id is used. If id not included, parent array name is used.
                'cssClass'  => 'custom_menu',         // The custom CSS class name added to the menu item, appended to h2.menu- in Swarm CSS
                'title'     => 'MyMenuItem',          // The text that will be shown on the button.    
                                                      // If not included in array, id is used. If id not included, parent array name is used.    
                'class'     => '',                    // If not included in array or empty, the menu item is added to the main menu. 
                                                      // To add the menu item to the project menu for all of the projects, set to '\Projects\Menu\Helper\ProjectContextMenuHelper'
                'priority'  => 155,                   // The position the menu item is displayed at in the menu.
                                                      // If not included in the array, the menu item is placed at the bottom of the menu.  
                'roles'     => null,                  // ['null'|'authenticated'|'admin'|'super'] If not included in the array, null is the default
                                                      // Specifies the minimum level of Perforce user that can see the menu item. 
                                                      // 'authenticated' = any authorized user, 'null' = unauthenticated users
            ),
        ),
        'notifications' => array(
            'honor_p4_reviews'      => false,
            'opt_in_review_path'    => '//depot/swarm',
            'disable_change_emails' => false,
        ),
        'p4' => array(
            'port'       => 'my-helix-core-server:1666',
            'user'       => 'admin_userid',
            'password'   => 'admin user ticket or password',
            'sso'        => 'disabled', // ['disabled'|'optional'|'enabled'] default value is 'disabled' 
            'proxy_mode' => true, // defaults to true
            'slow_command_logging' => array(
                3,
                10 => array('print', 'shelve', 'submit', 'sync', 'unshelve'),
            ),
            'max_changelist_files' => 1000,
            'auto_register_url'    => true,
        ),
        'projects' => array(
            'mainlines' => array(
                'stable', 'release', // 'main', 'mainline', 'master', and 'trunk' are hardcoded, there is no need to add them to the array
            ),
            'add_admin_only'           => false,
            'add_groups_only'          => array(),
            'edit_name_admin_only'     => false,
            'edit_branches_admin_only' => false,
            'readme_mode'              => 'enabled',
            'fetch'                    => array('maximum' => 0), // defaults to 0 (disabled)
            'allow_view_settings'      => false, // defaults to false 
        ),
        'queue'  => array(
            'workers'             => 3,    // defaults to 3
            'worker_lifetime'     => 595,  // defaults to 10 minutes (less 5 seconds)
            'worker_task_timeout' => 1800, // defaults to 30 minutes
            'worker_memory_limit' => '1G', // defaults to 1 gigabyte
        ),
        'redis' => array(
            'options' => array( 
                'password' => null, // Defaults to null
                'namespace' => 'Swarm',
                'server' => array( 
                    'host' => 'localhost', // Defaults to 'localhost' or enter your Redis server hostname
                    'port' => '7379', // Defaults to '7379' or enter your Redis server port			
                ),
            ),
            'items_batch_size' => 100000,
            'check_integrity' => '03:00', // Defaults to '03:00' Use one of the following options: 
                                          //'HH:ii' (24 hour format with leading zeros), the time the integrity check starts each day
                                          // positive integer, the time between integrity checks in seconds. '0' = integrity check disabled
            'population_lock_timeout' => 300, // Timeout for initial cache population. Defaults to 300 seconds. 
        ),
        'reviews' => array(
            'patterns' => array( 
                'octothorpe' => array(     // #review or #review-1234 with surrounding whitespace/eol
                    'regex'  => '/(?P<pre>(?:\s|^)\(?)\#(?P<keyword>review|append|replace)(?:-(?P<id>[0-9]+))?(?P<post>[.,!?:;)]*(?=\s|$))/i', 
                    'spec'   => '%pre%#%keyword%-%id%%post%',
                    'insert' => "%description%\n\n#review-%id%",
                    'strip'  => '/^\s*\#(review|append|replace)(-[0-9]+)?(\s+|$)|(\s+|^)\#(review|append|replace)(-[0-9]+)?\s*$/i',
                ),
                'leading-square' => array(     // [review] or [review-1234] at start
                    'regex'  => '/^(?P<pre>\s*)\[(?P<keyword>review|append|replace)(?:-(?P<id>[0-9]+))?\](?P<post>\s*)/i', 
                    'spec'  => '%pre%[%keyword%-%id%]%post%',
                ),
                'trailing-square' => array(     // [review] or [review-1234] at end
                    'regex'  => '/(?P<pre>\s*)\[(?P<keyword>review|append|replace)(?:-(?P<id>[0-9]+))?\](?P<post>\s*)?$/i',
                    'spec'   => '%pre%[%keyword%-%id%]%post%',
                ),
            ),
            'filters' => array(
                'filter-max' => 15,
                'result_sorting' => true, 
                'date_field' => 'updated', // 'created' displays and sorts by created date, 'updated' displays and sorts by last updated 
            ),
            'cleanup' => array(
                'mode'        => 'user', // auto - follow default, user - present checkbox(with default)
                'default'     => false,  // clean up pending changelists on commit
                'reopenFiles' => false,   // re-open any opened files into the default changelist
            ),
            'statistics' => array(
                'complexity' => array(
                    'calculation' => 'default', // 'default|disabled'
                    'high' => 300,
                    'low' => 30
                ),
            ),
            'allow_author_change'             => true,
            'allow_author_obliterate'         => false,
            'commit_credit_author'            => true,
            'commit_timeout'                  => 1800, // 30 minutes
            'disable_approve_when_tasks_open' => false,    
            'disable_commit'                  => true,
            'disable_self_approve'            => false,
            'end_states'                      => array('archived', 'rejected', 'approved:commit'),
            'expand_all_file_limit'           => 10, 
            'expand_group_reviewers'          => false, 
            'ignored_users'                   => array(),
            'max_secondary_navigation_items'  => 6,  // defaults to 6
            'moderator_approval'              => 'any', // 'any|each'
            'more_context_lines'              => 10, // defaults to 10 lines
            'process_shelf_delete_when'       => array(),
            'sync_descriptions'               => true,
            'unapprove_modified'              => true,
        ),
        'search' => array(
            'maxlocktime'     => 5000, // 5 seconds, in milliseconds
            'p4_search_host'  => '',   // optional URL to Helix Search Tool
        ),
        'security'  => array(
            'disable_system_info'      => false,
            'email_restricted_changes' => false,
            'emulate_ip_protections'   => false,  // defaults to false
            'https_port'               => null,
            'https_strict'             => false,
            'https_strict_redirect'    => true,
            'require_login'            => true,
            'prevent_login'            => array(
                'service_user1',
                'service_user2',
            ),
        ),
        'session'  => array(
            'cookie_lifetime'            => 0, // lifetime in seconds, default value is 0=expire when browser closed
            'remembered_cookie_lifetime' => 60*60*24*30, // lifetime in seconds, default value is 30 days
            'user_login_status_cache'    => 10, // Set in seconds, default value is 10 seconds. 
                                                // Set to 0 to disable the cache and make Swarm
                                                // check the user login status for every call to Helix Server.
            'gc_maxlifetime'             => 60*60*24*30, // lifetime in seconds, default value is 30 days  
            'gc_divisor'                 => 100, // 100 user requests
        ),
        'short_links' => array(
            'hostname'     => 'myho.st',
            'external_url' => 'https://myho.st:port/sub-folder',
        ),
        'slack' => [
             'token' => 'TOKEN',
             'project_channels'       => [
                                           'myproject' => ['myproject-channel',], //For project 'myproject' the slack notification 
                                                                                  //will go into the Slack channel 'myproject-channel'.
             ],
             'summary_file_names'     => false, //Attaches the file to the original notification message sent to a Slack channel.
             'summary_file_limit'     => 10, //Limits the number of files shown in the original notification message sent to a Slack channel, default value is 10.
             'user' => [
                  'enabled'           => true, //Forces the Swarm app to use the custom username, overrides the Swarm app details.
                  'name'              => 'Helix Swarm', //This is the username shown in the Slack channel when a notification is posted.
                  'icon'              => 'URL', //This is the avatar icon shown in the Slack channel when a notification is posted, overrides the avatar set in the Swarm app. 
                  'force_user_header' => false, //The Slack notification shows the username and avatar only for the first post by a user, default value is false. 
             ],
        ],
        'tag_processor' => array(
            'tags' => array(
                'wip' => '/(^|\s)+#wip($|\s)+/i'
            ),
        ),
        'test_definitions' => array(
            'project_and_branch_separator' => ':',
        ),
        'translator' => array(
            'detect_locale'             => true,
            'locale'                    => array("en_GB", "en_US"),
            'translation_file_patterns' => array(),
            'non_utf8_encodings'        => array('sjis', 'euc-jp', 'windows-1252'),
            'utf8_convert' => true,
        ),
        'upgrade' => array(
            'status_refresh_interval' => 10,	//Refresh page every 10 seconds
            'batch_size' => 1000,	//Fetch 1000 reviews to lower memory usage
        ),
        'users' => array(
           'dashboard_refresh_interval' => 300000, //Default 300000 milliseconds
           'display_fullname'           => true, 
           'settings' => array(
              'review_preferences' => array(
                  'show_comments_in_files'             => true,
                  'view_diffs_side_by_side'            => true,
                  'show_space_and_new_line_characters' => false,
                  'ignore_whitespace'                  => false,
              ),
              'time_preferences' => array(
                  'display'  => 'Timeago', // Default to 'Timeago' but can be set to 'Timestamp'
              ),
           ),
        ),
        'workflow' => array(
            'enabled' => true, // Switches the workflow feature on. Default is true
        ),
        'xhprof' => array(
            'slow_time'      => 3,
            'ignored_routes' => array('download', 'imagick', 'libreoffice', 'worker'),
        ),
    );
