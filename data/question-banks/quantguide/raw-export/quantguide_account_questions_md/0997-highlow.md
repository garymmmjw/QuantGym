# QuantGuide Question

## 997. High-Low

**Metadata**

- ID: `KbRAAHhxSXohJKX0whxT`
- URL: https://www.quantguide.io/questions/highlow
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: MSE
- Tags: Games, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You roll a fair $100-$sided die with values $1-100$ on the sides and observe the value that appears. You now must guess whether the second roll will be at least as large as the first roll or not. If the second value that appears is $y$ and you guess correctly, you receive $\$y$ payout. Otherwise, you receive nothing. Assuming optimal play, find the smallest integer $t$ at which we guess that the second roll is lower than the first.

### Hint

We have two strategies corresponding to each $t$, which are betting higher and lower. Compute the expected returns for each of the two strategies for each $t$ and then set them equal.

### 解答

Let $x$ be the value of our first roll. Our optimal strategy is going to be that we say the second roll is lower if $x \geq t$ for some threshold $t$ and higher if $x < t$. Let $t$ be an integer. We have two strategies corresponding to each $t$, which are betting higher and lower. Let's compute the expected returns for each of the two strategies for each $t$.

$$$$

Let $R_{l,t}$ denote the returns of the strategy where we guess lower for the second roll with first roll being $t$ and $Y$ be the value of the second roll. Then $\mathbb{E}[R_{l,t}] = \mathbb{E}[R_{l,t} \mid Y < t]\mathbb{P}[Y < t] + \mathbb{E}[R_{l,t} \mid Y \geq t]\mathbb{P}[Y \geq t]$ by Law of Total Expectation. The second term evaluates to $0$, since we receive no payout if we guess incorrectly. Given $Y < t$, we know that the value is discrete uniform on $\{1,2,\dots, t-1\}$, which has a mean of $\dfrac{t}{2}$. The probability of observing a value that is strictly less than $t$ is $\dfrac{t-1}{100}$, as there are $t-1$ integers in $\{1,2,\dots, t-1\}$. Therefore, $\mathbb{E}[R_{l,t}] = \dfrac{1}{100} \cdot \dfrac{t(t-1)}{2}$.

$$$$

Similarly, let $R_{h,t}$ denote the returns of the strategy where we guess higher for the second roll with the first roll being $t$ and $Y$ be the value of the second roll. Then $\mathbb{E}[R_{h,t}] = \mathbb{E}[R_{h,t} \mid Y < t]\mathbb{P}[Y < t] + \mathbb{E}[R_{h,t} \mid Y \geq t]\mathbb{P}[Y \geq t]$ by Law of Total Expectation. The first term evaluates to $0$, since we receive no payout if we guess incorrectly. Given $Y \geq t$, we know that the value is discrete uniform on $\{t,t+1,\dots, 100\}$, which has mean $\dfrac{100+t}{2}$. The probability of rolling a value at least $t$ is $\dfrac{100 - (t-1)}{100}$, as it is the complement of the previous probability. Therefore, the expected payout in this case is $\dfrac{1}{100} \cdot \dfrac{(100+t)(101-t)}{2}$

$$$$

We now want to find the point of indifference i.e. when are the expected returns between guessing higher and lower equal. Note that $\mathbb{E}[R_{l,t}]$ is increasing in $t$ while $\mathbb{E}[R_{h,t}]$ is decreasing in $t$. This means that for whatever $t^*$ these two functions are equal at, we will guess lower for any value $> t^*$ and higher for any value $\leq t^*$ on the first roll. After cancelling denominators, we must solve $(100+t)(101-t) = t(t-1)$. This can be rearranged to $-2t^2+2t+10100 = 0$, at which $$t^* = \dfrac{-2 \pm \sqrt{4 - 4(-2)(10100)}}{2(-2)} = \dfrac{-2 \pm \sqrt{80804}}{-4}$$ Clearly, we are going need to subtract the square root, as otherwise $t^*$ will be negative. Once we do this, we see our threshold is approximately $71.57$. Therefore, if our first roll is $\geq 72$, we will guess lower for the second roll, meaning $72$ is the answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "72"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "KbRAAHhxSXohJKX0whxT",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8145768,
    "source": "MSE",
    "status": "published",
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "High-Low",
    "topic": "probability",
    "urlEnding": "highlow"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "KbRAAHhxSXohJKX0whxT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Games"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "High-Low",
    "topic": "probability",
    "urlEnding": "highlow"
  }
}
```
