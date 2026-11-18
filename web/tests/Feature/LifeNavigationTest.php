<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\CreatesBrain;
use Tests\TestCase;

class LifeNavigationTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    public function test_life_overview_requires_sign_in(): void
    {
        $this->get('/life')->assertRedirect('/login');
        $this->get('/scratchpad')->assertRedirect('/login');
    }

    public function test_sidebar_and_secondary_navigation_have_the_same_order_and_labels(): void
    {
        $this->signedIn($this->owner());

        $response = $this->get('/life')->assertOk()->assertViewIs('life-overview');
        $document = new \DOMDocument;
        @$document->loadHTML($response->getContent());
        $xpath = new \DOMXPath($document);
        $expected = ['Overview', 'Ask', 'Smart Home', 'Nutrition', 'Garage', 'Fuel & mileage', 'Capture inbox', 'New capture', 'Account', 'Connections'];
        foreach (['//div[@data-feature="life"]//div[contains(@class,"shell-subitems")]/a', '//nav[@aria-label="Life sections"]/a'] as $selector) {
            $links = $xpath->query($selector);
            $this->assertSame($expected, array_map(fn ($link) => trim($link->textContent), iterator_to_array($links)));
            $this->assertSame('page', $links->item(0)->getAttribute('aria-current'));
        }
        $this->get('/life/home')->assertOk()->assertSee('Smart Home')->assertSee('aria-label="Life sections"', false);
        $scratchpad = $this->get('/scratchpad')->assertOk()->assertViewIs('scratchpad')->assertSee('Read and edit Scratchpad');
        $scratchpad->assertSeeInOrder(['data-shell-nav="reminders"', 'data-shell-nav="scratchpad"', 'data-shell-nav="transcription"'], false);
    }
}
