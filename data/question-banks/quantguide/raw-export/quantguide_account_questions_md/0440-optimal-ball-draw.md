# QuantGuide Question

## 440. Optimal Ball Draw

**Metadata**

- ID: `7D7e88MKU4yKGtCPiBaI`
- URL: https://www.quantguide.io/questions/optimal-ball-draw
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS
- Tags: Games
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

There are 2 white and 3 black balls in an urn. Rajiv randomly draws balls out of the urn without replacement; he has the option to stop drawing at any time. For every white ball he draws, he earns $\$1$, but for every black ball he draws, he loses $\$1$. Suppose Rajiv draws balls following the optimal strategy. What is his expected loss or gain?

### Hint

Compute the expected payout based on when he receives his first white ball

### 解答

There is a $\frac{2}{5}$ chance that Rajiv draws the first white ball on the first draw. There is a $\frac{3}{5} \cdot \frac{2}{4} = \frac{3}{10}$ chance that Rajiv draws the first white ball on the second draw. There is a $\frac{3}{5} \cdot \frac{2}{4} \cdot \frac{2}{3} = \frac{1}{5}$ chance that Rajiv draws the first white ball on the third draw. And finally, there is a $\frac{3}{5} \cdot \frac{2}{4} \cdot \frac{1}{3} = \frac{1}{10}$ chance that Rajiv draws the first white ball on the fourth draw. $$$$

If Rajiv draws a white ball on the first draw, then if he were to keep going until the last white ball is drawn, the expected value of his gain/loss would be $\frac{1}{4} \cdot 1 \text{  (HTTT)  } + \frac{1}{4} \cdot 0 \text{  (THTT)  } + \frac{1}{4} \cdot -1 \text{  (TTHT)  } - \frac{1}{4} \cdot -2 \text{  (TTTH)  } = -\frac{1}{2}$. We conclude that if Rajiv draws his first white ball on the first draw, the he should stop immediately and receive the payoff of $+\$1$. $$$$

If Rajiv draws a white ball on the second draw, then if he were to keep going until the last white ball is drawn, the expected value of his gain/loss would be $\frac{1}{3} \cdot 1 \text{  (HTT)  } + \frac{1}{3} \cdot 0 \text{  (THT)  } + \frac{1}{3} \cdot -1 \text{  (TTH)  } = 0$. So, if Rajiv draws his first white ball on the second draw, his payoff will be $0 + 0 = +\$0$ regardless of whether he keeps drawing until the last head is drawn. $$$$

If Rajiv draws a white ball on the third draw, then if he were to keep going until the last white ball is drawn, the expected value of his gain/loss would be $\frac{1}{2} \cdot 1 \text{  (HT)  } + \frac{1}{2} \cdot 0 \text{  (TH)  } = 0$. So, if Rajiv draws his first white ball on the third draw, he should keep drawing until he gets the second white ball, with total payoff $-1 + \frac{1}{2} = -\$\frac{1}{2}$ $$$$

And of course, if Rajiv gets 3 blacks in a row for his first 3 draw, he should finish drawing the last two white balls, which gives him a payoff of $-3 + 2 = -\$1$. $$$$

In total, his expected profit is $\frac{2}{5} - \frac{1}{5} \cdot \frac{1}{2} - \frac{1}{10} = \frac{1}{5}$. $$$$

Note that, while the above solution is more methodical, one could simply write out all $\frac{5!}{2!3!} = 10$ permutations of 2 white and 3 black balls. It would then be much faster to visualize potential strategies.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/5"
    ],
    "difficulty": "medium",
    "id": "7D7e88MKU4yKGtCPiBaI",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 3498108,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Optimal Ball Draw",
    "topic": "probability",
    "urlEnding": "optimal-ball-draw"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "7D7e88MKU4yKGtCPiBaI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      }
    ],
    "title": "Optimal Ball Draw",
    "topic": "probability",
    "urlEnding": "optimal-ball-draw"
  }
}
```
