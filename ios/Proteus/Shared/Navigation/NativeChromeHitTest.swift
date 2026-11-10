import UIKit
import WebKit

/// Match the actual glyph under the gesture, preserving WebKit's own text selection.
@MainActor enum NativeChromeHitTest {
    static func isBackground(_ point: CGPoint, in view: WKWebView) async -> Bool {
        guard point.x.isFinite, point.y.isFinite, view.bounds.width > 0, view.bounds.height > 0 else { return false }
        let script = """
        (() => {
          const x = \(point.x) * innerWidth / \(view.bounds.width), y = \(point.y) * innerHeight / \(view.bounds.height);
          let element = document.elementFromPoint(x,y);
          for (let depth=0; element?.shadowRoot && depth<8; depth++) {
            const child = element.shadowRoot.elementFromPoint?.(x,y);
            if (!child || child===element) break;
            element=child;
          }
          if (!element || element.closest('a,button,input,textarea,select,[contenteditable],video,audio,img,[role="button"]')) return false;
          const range=document.caretRangeFromPoint?.(x,y);
          if (range?.startContainer.nodeType===Node.TEXT_NODE) {
            const node=range.startContainer;
            for (const index of [range.startOffset,range.startOffset-1]) {
              if(index<0 || index>=node.length || !node.textContent[index].trim()) continue;
              const glyph=document.createRange();glyph.setStart(node,index);glyph.setEnd(node,index+1);
              for(const rect of glyph.getClientRects()) if(x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom) return false;
            }
          }
          return true;
        })()
        """
        return (try? await view.evaluateJavaScript(script)) as? Bool ?? false
    }
    static func containsEditorOrControl(_ view: UIView?) -> Bool {
        var current = view
        while let value = current {
            if value is UIControl || value is UITextView || value is UITextField { return true }
            current = value.superview
        }
        return false
    }
}
