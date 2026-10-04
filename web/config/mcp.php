<?php

return ['redirect_domains' => ['https://chatgpt.com', 'https://chat.openai.com'], 'custom_schemes' => [], 'authorization_server' => config('app.url'), 'tool_search' => ['max_tool_calls' => 10, 'max_output_bytes' => 65536]];
