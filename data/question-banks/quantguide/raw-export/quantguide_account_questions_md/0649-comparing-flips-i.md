# QuantGuide Question

## 649. Comparing Flips I

**Metadata**

- ID: `ZJLRAc21FvBK4AUBPGmw`
- URL: https://www.quantguide.io/questions/comparing-flips-i
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG
- Source: N/A
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-9 21:33:57 America/New_York
- Last Edited By: Gabe

### 题干

Audrey repeatedly flips a coin until she sees a pattern of $HHT$ or $HTT$. What is the probability that $HHT$ occurs before $HTT$?

### Hint

Because both $HHT$ and $HTT$ begin with heads, we can ignore any pattern with leading tails. Instead, consider the four outcomes of flipping the coin three times. For each case, what is the probability that HHT or HTT will occur before the other?

### 解答

Both $HHT$ and $HTT$ begin with heads, so we can ignore any pattern with leading tails. Consider the case where our sequence begins with heads. Given that the first flip is heads, each of the following four cases occurs with probability $\frac{1}{4}$: $HHH$, $HHT$, $HTH$, $HTT$. In the case of $HHH$, then Audrey will see the pattern $HHT$ first with probability $1$, since it is impossible for her to roll two tails without first seeing $HHT$. In the case of $HHT$, $HHT$ appears first. In the case of $HTT$, $HTT$ appears first. And finally, in the case of $HTH$, we are returned to our original state of our sequence of interest beginning with heads. Since $HHT$, $HTT$, and $HHH$ occur with equal probability, and since $HHT$ and $HHH$ result in $HHT$ appearing first, the probability that $HHT$ appears first is $\frac{2}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ZJLRAc21FvBK4AUBPGmw",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-9 21:33:57 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5216869,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Comparing Flips I",
    "topic": "probability",
    "urlEnding": "comparing-flips-i",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "ZJLRAc21FvBK4AUBPGmw",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Comparing Flips I",
    "topic": "probability",
    "urlEnding": "comparing-flips-i"
  }
}
```
